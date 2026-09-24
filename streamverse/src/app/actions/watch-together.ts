"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getPersonalizationContext } from "@/lib/ai/personal-context";
import { mediateWatchTogether } from "@/lib/ai/watch-together";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getWatchTogetherRoom } from "@/lib/watch-together-data";
import { getSharedQueueItems } from "@/lib/watch-together-queue-data";
import { normalizeResponses, rankSuggestions, suggestionKey, toggleVote } from "@/lib/watch-together";
import type { PlaybackState, WatchSuggestion, WatchTogetherRoom } from "@/types/watch-together";


const nameSchema = z.string().trim().min(1).max(80);
const codeSchema = z.string().regex(/^[a-z0-9]{12}$/);
const mediaSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
  mediaId: z.string().trim().min(1).max(32),
  title: z.string().trim().min(1).max(200),
  coverImageUrl: z.string().url().nullable(),
  voteAverage: z.number().min(0).max(10).optional(),
});
const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(80),
  isPublic: z.boolean().optional(),
  maxParticipants: z.number().int().min(2).max(100).optional(),
  mediaType: z.enum(["movie", "tv", "anime"]).optional().nullable(),
  mediaId: z.string().trim().max(32).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
});
const messageSchema = z.string().trim().min(1).max(1000);

export type WatchTogetherActionResult =
  | { ok: true; room: WatchTogetherRoom; inviteUrl?: string }
  | { ok: false; error: "unauthenticated" | "unconfigured" | "not_found" | "closed" | "forbidden" | "failed" | "full" };
type WatchTogetherError = Extract<WatchTogetherActionResult, { ok: false }>["error"];
type ParticipantContext = {
  auth: NonNullable<Awaited<ReturnType<typeof prerequisites>>>;
  room: WatchTogetherRoom;
  participant: WatchTogetherRoom["participants"][number];
};

async function prerequisites() {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  return user ? { user, supabase: await createSupabaseServerClient() } : null;
}
function missingPrerequisiteError() {
  return isSupabaseConfigured() ? ("unauthenticated" as const) : ("unconfigured" as const);
}
function invalidate(code: string) {
  revalidatePath("/watch-together");
  revalidatePath(`/watch-together/${code}`);
}

export async function createWatchTogetherRoom(
  input: z.infer<typeof createRoomSchema>,
): Promise<WatchTogetherActionResult> {
  const parsed = createRoomSchema.safeParse(input);
  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };
  if (!parsed.success) return { ok: false, error: "failed" };

  const inviteCode = randomBytes(6).toString("hex");
  const displayName =
    (auth.user.user_metadata?.full_name as string | undefined) ??
    auth.user.email?.split("@")[0] ??
    "Host";

  const { data: room, error } = await auth.supabase
    .from("watch_sessions")
    .insert({
      host_user_id: auth.user.id,
      name: parsed.data.name,
      invite_code: inviteCode,
      is_public: parsed.data.isPublic ?? false,
      max_participants: parsed.data.maxParticipants ?? 10,
      media_type: parsed.data.mediaType,
      media_id: parsed.data.mediaId,
      description: parsed.data.description,
    })
    .select("id")
    .single();

  if (error || !room) return { ok: false, error: "failed" };
  const { error: participantError } = await auth.supabase
    .from("watch_session_participants")
    .insert({ session_id: room.id, user_id: auth.user.id, display_name: displayName });
  if (participantError) return { ok: false, error: "failed" };
  const hydrated = await getWatchTogetherRoom(inviteCode);
  if (!hydrated) return { ok: false, error: "failed" };
  invalidate(inviteCode);
  return {
    ok: true,
    room: hydrated,
    inviteUrl: `${publicEnv.siteUrl}/watch-together/${inviteCode}`,
  };
}

export async function joinWatchTogetherRoom(inviteCode: string): Promise<WatchTogetherActionResult> {
  const parsed = codeSchema.safeParse(inviteCode);
  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };
  if (!parsed.success) return { ok: false, error: "not_found" };

  const room = await getWatchTogetherRoom(parsed.data);
  if (!room) return { ok: false, error: "not_found" };
  if (room.status === "closed" || room.status === "ended")
    return { ok: false, error: "closed" };

  // Check if room is full
  if (room.participants.length >= room.maxParticipants)
    return { ok: false, error: "full" };

  // Check if user is already a participant
  if (!room.participants.some((participant) => participant.userId === auth.user.id)) {
    const displayName =
      (auth.user.user_metadata?.full_name as string | undefined) ??
      auth.user.email?.split("@")[0] ??
      "Guest";
    const { error } = await auth.supabase
      .from("watch_session_participants")
      .insert({ session_id: room.id, user_id: auth.user.id, display_name: displayName });
    if (error) return { ok: false, error: "failed" };
  }
  const hydrated = await getWatchTogetherRoom(parsed.data);
  if (!hydrated) return { ok: false, error: "failed" };
  invalidate(parsed.data);
  return { ok: true, room: hydrated };
}

async function ownParticipant(code: string): Promise<ParticipantContext | { error: WatchTogetherError }> {
  const auth = await prerequisites();
  if (!auth) return { error: missingPrerequisiteError() } as const;
  const room = await getWatchTogetherRoom(code);
  if (!room) return { error: "not_found" } as const;
  if (room.status === "closed" || room.status === "ended")
    return { error: "closed" } as const;
  const participant = room.participants.find((item) => item.userId === auth.user.id);
  if (!participant) return { error: "forbidden" } as const;
  return { auth, room, participant };
}

export async function addWatchSuggestion(
  inviteCode: string,
  media: z.infer<typeof mediaSchema>,
): Promise<WatchTogetherActionResult> {
  const parsedCode = codeSchema.safeParse(inviteCode);
  const parsedMedia = mediaSchema.safeParse(media);
  if (!parsedCode.success || !parsedMedia.success)
    return { ok: false, error: "failed" };
  const context = await ownParticipant(parsedCode.data);
  if (!("auth" in context)) return { ok: false, error: context.error };
  const suggestion: WatchSuggestion = {
    ...parsedMedia.data,
    key: suggestionKey(parsedMedia.data.mediaType, parsedMedia.data.mediaId),
    addedBy: context.participant.id,
  };
  const responses = normalizeResponses(context.participant.responses);
  if (!responses.suggestions.some((item) => item.key === suggestion.key))
    responses.suggestions.push(suggestion);
  const { error } = await context.auth.supabase
    .from("watch_session_participants")
    .update({ responses })
    .eq("id", context.participant.id)
    .eq("user_id", context.auth.user.id);
  if (error) return { ok: false, error: "failed" };
  const room = await getWatchTogetherRoom(parsedCode.data);
  if (!room) return { ok: false, error: "failed" };
  invalidate(parsedCode.data);
  return { ok: true, room };
}

export async function removeWatchSuggestion(
  inviteCode: string,
  key: string,
): Promise<WatchTogetherActionResult> {
  const context = await ownParticipant(inviteCode);
  if (!("auth" in context)) return { ok: false, error: context.error };
  const responses = normalizeResponses(context.participant.responses);
  responses.suggestions = responses.suggestions.filter((item) => item.key !== key);
  responses.votes = responses.votes.filter((vote) => vote !== key);
  const { error } = await context.auth.supabase
    .from("watch_session_participants")
    .update({ responses })
    .eq("id", context.participant.id)
    .eq("user_id", context.auth.user.id);
  if (error) return { ok: false, error: "failed" };
  const room = await getWatchTogetherRoom(inviteCode);
  if (!room) return { ok: false, error: "failed" };
  invalidate(inviteCode);
  return { ok: true, room };
}

export async function toggleWatchSuggestionVote(
  inviteCode: string,
  key: string,
): Promise<WatchTogetherActionResult> {
  const context = await ownParticipant(inviteCode);
  if (!("auth" in context)) return { ok: false, error: context.error };
  if (!rankSuggestions(context.room.participants).some((item) => item.key === key))
    return { ok: false, error: "not_found" };
  const { error } = await context.auth.supabase
    .from("watch_session_participants")
    .update({ responses: toggleVote(normalizeResponses(context.participant.responses), key) })
    .eq("id", context.participant.id)
    .eq("user_id", context.auth.user.id);
  if (error) return { ok: false, error: "failed" };
  const room = await getWatchTogetherRoom(inviteCode);
  if (!room) return { ok: false, error: "failed" };
  invalidate(inviteCode);
  return { ok: true, room };
}

export async function setWatchTogetherReady(
  inviteCode: string,
  isReady: boolean,
): Promise<WatchTogetherActionResult> {
  const context = await ownParticipant(inviteCode);
  if (!("auth" in context)) return { ok: false, error: context.error };
  const { error } = await context.auth.supabase
    .from("watch_session_participants")
    .update({ is_ready: isReady })
    .eq("id", context.participant.id)
    .eq("user_id", context.auth.user.id);
  if (error) return { ok: false, error: "failed" };
  const room = await getWatchTogetherRoom(inviteCode);
  if (!room) return { ok: false, error: "failed" };
  invalidate(inviteCode);
  return { ok: true, room };
}

/**
 * Start the watch party (change status from open to active).
 * Only the host can start the room.
 */
export async function startWatchTogetherRoom(
  inviteCode: string,
): Promise<WatchTogetherActionResult> {
  const parsed = codeSchema.safeParse(inviteCode);
  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };
  if (!parsed.success) return { ok: false, error: "not_found" };

  const room = await getWatchTogetherRoom(parsed.data);
  if (!room) return { ok: false, error: "not_found" };
  if (room.status !== "open") return { ok: false, error: "failed" };
  if (room.hostUserId !== auth.user.id) return { ok: false, error: "forbidden" };

  const { error } = await auth.supabase
    .from("watch_sessions")
    .update({ status: "active" })
    .eq("id", room.id)
    .eq("host_user_id", auth.user.id);

  if (error) return { ok: false, error: "failed" };
  const hydrated = await getWatchTogetherRoom(inviteCode);
  if (!hydrated) return { ok: false, error: "failed" };
  invalidate(inviteCode);
  return { ok: true, room: hydrated };
}

/**
 * End the watch party (change status to ended).
 * Only the host can end the room.
 */
export async function endWatchTogetherRoom(
  inviteCode: string,
): Promise<WatchTogetherActionResult> {
  const parsed = codeSchema.safeParse(inviteCode);
  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };
  if (!parsed.success) return { ok: false, error: "not_found" };

  const room = await getWatchTogetherRoom(parsed.data);
  if (!room) return { ok: false, error: "not_found" };
  if (room.status === "ended") return { ok: false, error: "closed" };
  if (room.hostUserId !== auth.user.id) return { ok: false, error: "forbidden" };

  const { error } = await auth.supabase
    .from("watch_sessions")
    .update({ status: "ended" })
    .eq("id", room.id)
    .eq("host_user_id", auth.user.id);

  if (error) return { ok: false, error: "failed" };
  const hydrated = await getWatchTogetherRoom(inviteCode);
  if (!hydrated) return { ok: false, error: "failed" };
  invalidate(inviteCode);
  return { ok: true, room: hydrated };
}

/**
 * Leave a watch party.
 * If the user is the host, transfer host to the longest-connected participant.
 */
export async function leaveWatchTogetherRoom(
  inviteCode: string,
): Promise<WatchTogetherActionResult> {
  const parsed = codeSchema.safeParse(inviteCode);
  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };
  if (!parsed.success) return { ok: false, error: "not_found" };

  const room = await getWatchTogetherRoom(parsed.data);
  if (!room) return { ok: false, error: "not_found" };
  if (room.status === "ended") return { ok: false, error: "closed" };

  const participant = room.participants.find(
    (item) => item.userId === auth.user.id,
  );
  if (!participant) return { ok: false, error: "forbidden" };

  // If user is host, transfer to longest-connected participant
  if (room.hostUserId === auth.user.id && room.participants.length > 1) {
    // Find the longest-connected participant (excluding the host)
    const sortedParticipants = [...room.participants]
      .filter((p) => p.userId !== auth.user.id)
      .sort((a, b) =>
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
      );

    if (sortedParticipants.length > 0) {
      const newHost = sortedParticipants[0];
      const { error: hostError } = await auth.supabase
        .from("watch_sessions")
        .update({ host_user_id: newHost.userId })
        .eq("id", room.id);
      if (hostError) return { ok: false, error: "failed" };
    }
  }

  // Remove the participant
  const { error } = await auth.supabase
    .from("watch_session_participants")
    .delete()
    .eq("id", participant.id)
    .eq("user_id", auth.user.id);

  if (error) return { ok: false, error: "failed" };
  const hydrated = await getWatchTogetherRoom(parsed.data);
  if (!hydrated) return { ok: false, error: "failed" };
  invalidate(inviteCode);
  return { ok: true, room: hydrated };
}

const sharedQueueMediaSchema = z.object({
  mediaType: z.enum(["movie", "tv", "anime"]),
  mediaId: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(200),
  posterUrl: z.string().trim().max(2048).optional().nullable(),
});

export async function addToSharedQueueAction(
  inviteCode: string,
  input: z.infer<typeof sharedQueueMediaSchema>,
): Promise<{ ok: true } | { ok: false; error: "unauthenticated" | "unconfigured" | "not_found" | "forbidden" | "failed" }> {


  const parsedInvite = codeSchema.safeParse(inviteCode);
  if (!parsedInvite.success) return { ok: false, error: "not_found" };

  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };

  const parsedInput = sharedQueueMediaSchema.safeParse(input);
  if (!parsedInput.success) return { ok: false, error: "failed" };

  const room = await getWatchTogetherRoom(parsedInvite.data);
  if (!room) return { ok: false, error: "not_found" };

  const isParticipant = room.participants.some((p) => p.userId === auth.user.id);
  if (!isParticipant) return { ok: false, error: "forbidden" };

  const { error } = await auth.supabase
    .from("watch_session_queue")
    .insert({
      session_id: room.id,
      media_type: parsedInput.data.mediaType,
      media_id: parsedInput.data.mediaId,
      title: parsedInput.data.title,
      poster_url: parsedInput.data.posterUrl ?? null,
      suggested_by_user_id: auth.user.id,
    });

  if (error) {
    // Postgres unique violation => idempotent no-op
    // (code is stable: 23505)
    const pgCode = (error as any)?.code;
    if (pgCode === "23505") return { ok: true };
    return { ok: false, error: "failed" };
  }

  invalidate(parsedInvite.data);
  return { ok: true };
}

export async function voteOnQueueItemAction(
  inviteCode: string,
  input: { queueItemId: string; vote: 1 | -1 },
): Promise<
  | { ok: true }
  | {
      ok: false;
      error: "unauthenticated" | "unconfigured" | "not_found" | "forbidden" | "failed";
    }
> {
  const parsedInvite = codeSchema.safeParse(inviteCode);
  if (!parsedInvite.success) return { ok: false, error: "not_found" };

  const parsedQueueItemId = z
    .string()
    .trim()
    .min(1)
    .max(64)
    .safeParse(input.queueItemId);

  const parsedVote = z.enum(["1", "-1"]).safeParse(String(input.vote));

  if (!parsedQueueItemId.success || !parsedVote.success)
    return { ok: false, error: "failed" };

  const vote: 1 | -1 = parsedVote.data === "1" ? 1 : -1;

  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };

  const room = await getWatchTogetherRoom(parsedInvite.data);
  if (!room) return { ok: false, error: "not_found" };

  const isParticipant = room.participants.some((p) => p.userId === auth.user.id);
  if (!isParticipant) return { ok: false, error: "forbidden" };

  const { data: queueRow, error: queueLookupError } = await auth.supabase
    .from("watch_session_queue")
    .select("id, session_id")
    .eq("id", parsedQueueItemId.data)
    .single();

  if (queueLookupError || !queueRow) return { ok: false, error: "not_found" };
  if (queueRow.session_id !== room.id) return { ok: false, error: "forbidden" };

  const { error: upsertError } = await auth.supabase
    .from("watch_session_queue_votes")
    .upsert(
      {
        queue_item_id: parsedQueueItemId.data,
        user_id: auth.user.id,
        vote,
      },
      { onConflict: "queue_item_id,user_id" },
    );

  if (upsertError) return { ok: false, error: "failed" };

  invalidate(parsedInvite.data);
  return { ok: true };
}

export async function removeQueueVoteAction(
  inviteCode: string,
  queueItemId: string,
): Promise<{ ok: true } | { ok: false; error: "unauthenticated" | "unconfigured" | "not_found" | "forbidden" | "failed" }> {

  const parsedInvite = codeSchema.safeParse(inviteCode);

  const parsedQueueItemId = z.string().trim().min(1).max(64).safeParse(queueItemId);
  if (!parsedInvite.success || !parsedQueueItemId.success) return { ok: false, error: "failed" };

  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };

  const room = await getWatchTogetherRoom(parsedInvite.data);
  if (!room) return { ok: false, error: "not_found" };

  const isParticipant = room.participants.some((p) => p.userId === auth.user.id);
  if (!isParticipant) return { ok: false, error: "forbidden" };

  // Prevent cross-room deletions: verify queue item belongs to this session.
  const { data: queueRow, error: queueLookupError } = await auth.supabase
    .from("watch_session_queue")
    .select("id, session_id")
    .eq("id", parsedQueueItemId.data)
    .single();

  if (queueLookupError || !queueRow) return { ok: false, error: "not_found" };
  if (queueRow.session_id !== room.id) return { ok: false, error: "forbidden" };

  // Idempotent: deleting a non-existing vote is treated as success.
  const { error: deleteError } = await auth.supabase
    .from("watch_session_queue_votes")
    .delete()
    .eq("queue_item_id", parsedQueueItemId.data)
    .eq("user_id", auth.user.id);

  if (deleteError) return { ok: false, error: "failed" };

  invalidate(parsedInvite.data);
  return { ok: true };
}

export async function removeFromSharedQueueAction(
  inviteCode: string,
  queueItemId: string,
): Promise<
  { ok: true } |
  {
    ok: false;
    error: "unauthenticated" | "unconfigured" | "not_found" | "forbidden" | "failed";
  }
> {
  const parsedInvite = codeSchema.safeParse(inviteCode);
  const parsedQueueItemId = z.string().trim().min(1).max(64).safeParse(queueItemId);

  if (!parsedInvite.success || !parsedQueueItemId.success)
    return { ok: false, error: "failed" };

  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };

  const room = await getWatchTogetherRoom(parsedInvite.data);
  if (!room) return { ok: false, error: "not_found" };

  const isParticipant = room.participants.some((p) => p.userId === auth.user.id);
  if (!isParticipant) return { ok: false, error: "forbidden" };

  const { data: queueItem, error: queueLookupError } = await auth.supabase
    .from("watch_session_queue")
    .select("id, session_id, suggested_by_user_id, media_type, media_id")
    .eq("id", parsedQueueItemId.data)
    .single();

  if (queueLookupError || !queueItem) return { ok: false, error: "not_found" };
  if (queueItem.session_id !== room.id) return { ok: false, error: "forbidden" };

  const isHost = room.hostUserId === auth.user.id;
  const isSuggestedByUser = String(queueItem.suggested_by_user_id) === String(auth.user.id);
  if (!isHost && !isSuggestedByUser) return { ok: false, error: "forbidden" };

  const isCurrentlySelected =
    queueItem.media_type === room.mediaType &&
    String(queueItem.media_id) === String(room.mediaId);

  const { error: deleteError } = await auth.supabase
    .from("watch_session_queue")
    .delete()
    .eq("id", parsedQueueItemId.data);

  if (deleteError) return { ok: false, error: "failed" };

  if (isCurrentlySelected) {
    const { error: updateError } = await auth.supabase
      .from("watch_sessions")
      .update({ media_type: null, media_id: null })
      .eq("id", room.id);

    if (updateError) return { ok: false, error: "failed" };
  }

  invalidate(parsedInvite.data);
  return { ok: true };
}

export async function selectQueueItemAction(
  inviteCode: string,
  queueItemId: string,
): Promise<
  { ok: true } |
  {
    ok: false;
    error: "unauthenticated" | "unconfigured" | "not_found" | "forbidden" | "failed";
  }
> {
  const parsedInvite = codeSchema.safeParse(inviteCode);
  const parsedQueueItemId = z.string().trim().min(1).max(64).safeParse(queueItemId);

  if (!parsedInvite.success || !parsedQueueItemId.success)
    return { ok: false, error: "failed" };

  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };

  const room = await getWatchTogetherRoom(parsedInvite.data);
  if (!room) return { ok: false, error: "not_found" };

  const isParticipant = room.participants.some((p) => p.userId === auth.user.id);
  if (!isParticipant) return { ok: false, error: "forbidden" };

  if (room.hostUserId !== auth.user.id) return { ok: false, error: "forbidden" };

  const { data: queueItem, error: queueLookupError } = await auth.supabase
    .from("watch_session_queue")
    .select("id, session_id, media_type, media_id")
    .eq("id", parsedQueueItemId.data)
    .single();

  if (queueLookupError || !queueItem) return { ok: false, error: "not_found" };
  if (queueItem.session_id !== room.id) return { ok: false, error: "forbidden" };

  const { error: updateError } = await auth.supabase
    .from("watch_sessions")
    .update({ media_type: queueItem.media_type, media_id: queueItem.media_id })
    .eq("id", room.id);

  if (updateError) return { ok: false, error: "failed" };

  invalidate(parsedInvite.data);
  return { ok: true };
}


export async function getSharedQueueAction(
  inviteCode: string,
): Promise<
  | { ok: true; items: Awaited<ReturnType<typeof getSharedQueueItems>> }
  | { ok: false; error: "unauthenticated" | "unconfigured" | "not_found" | "forbidden" | "failed" }
> {



  const parsedInvite = codeSchema.safeParse(inviteCode);
  if (!parsedInvite.success) return { ok: false, error: "not_found" };

  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };

  const room = await getWatchTogetherRoom(parsedInvite.data);
  if (!room) return { ok: false, error: "not_found" };

  const isParticipant = room.participants.some((p) => p.userId === auth.user.id);
  if (!isParticipant) return { ok: false, error: "forbidden" };

  const resolvedSessionId = room.id;
  const items = await getSharedQueueItems({
    sessionId: resolvedSessionId,
    currentUserId: auth.user.id,
  });

  if (!items) return { ok: false, error: "failed" };
  return { ok: true, items };
}

export async function computeWatchTogetherResults(

  inviteCode: string,
): Promise<WatchTogetherActionResult> {


  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };
  const room = await getWatchTogetherRoom(inviteCode);
  if (!room) return { ok: false, error: "not_found" };
  if (room.hostUserId !== auth.user.id) return { ok: false, error: "forbidden" };
  const ranked = rankSuggestions(room.participants);
  if (ranked.length === 0) return { ok: false, error: "failed" };
  const mediation = await mediateWatchTogether(
    ranked,
    await getPersonalizationContext(auth.user.id),
  );
  const reasonByKey = new Map(mediation.map((item) => [item.key, item.reason]));
  const { error: deleteError } = await auth.supabase
    .from("watch_session_results")
    .delete()
    .eq("session_id", room.id);
  if (deleteError) return { ok: false, error: "failed" };
  const { error: insertError } = await auth.supabase
    .from("watch_session_results")
    .insert(
      ranked.slice(0, 3).map((item) => ({
        session_id: room.id,
        media_type: item.mediaType,
        media_id: item.mediaId,
        rank: item.rank,
        reason: reasonByKey.get(item.key) ?? `${item.voteCount} votes.`,
      })),
    );
  if (insertError) return { ok: false, error: "failed" };
  const { error: closeError } = await auth.supabase
    .from("watch_sessions")
    .update({ status: "closed" })
    .eq("id", room.id)
    .eq("host_user_id", auth.user.id);
  if (closeError) return { ok: false, error: "failed" };
  const hydrated = await getWatchTogetherRoom(inviteCode);
  if (!hydrated) return { ok: false, error: "failed" };
  invalidate(inviteCode);
  return { ok: true, room: hydrated };
}

// WT-2: Send chat message - only for room participants
export async function sendChatMessage(
  inviteCode: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: "unauthenticated" | "unconfigured" | "not_found" | "forbidden" | "failed" }> {
  const parsed = codeSchema.safeParse(inviteCode);
  const parsedMessage = messageSchema.safeParse(body);
  if (!parsed.success || !parsedMessage.success)
    return { ok: false, error: "failed" };

  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };

  const room = await getWatchTogetherRoom(parsed.data);
  if (!room) return { ok: false, error: "not_found" };
  if (room.status === "ended" || room.status === "closed")
    return { ok: false, error: "forbidden" };

  // Verify user is a participant
  const participant = room.participants.find(
    (item) => item.userId === auth.user.id,
  );
  if (!participant) return { ok: false, error: "forbidden" };

  // Get user's avatar URL from their profile
  const avatarUrl = auth.user.user_metadata?.avatar_url as string | undefined;

  // Insert message - RLS will enforce user_id = auth.uid() and room membership
  const { error } = await auth.supabase
    .from("watch_session_messages")
    .insert({
      session_id: room.id,
      user_id: auth.user.id,
      display_name: participant.displayName,
      avatar_url: avatarUrl ?? null,
      body: parsedMessage.data,
    });

  if (error) return { ok: false, error: "failed" };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// WT-3: Host-authorized synchronized playback state
// ---------------------------------------------------------------------------

const playbackStateSchema = z.object({
  status: z.enum(["playing", "paused", "stopped"]),
  currentTime: z.number().min(0).max(1_000_000),
  playbackRate: z.number().min(0.1).max(4),
  sequence: z.number().int().min(0),
});

type PlaybackActionError =
  | "unauthenticated"
  | "unconfigured"
  | "not_found"
  | "forbidden"
  | "failed";

/**
 * Returns the shared playback state for a room. Any participant may read it.
 */
export async function getPlaybackState(
  inviteCode: string,
): Promise<{ ok: true; state: PlaybackState | null } | { ok: false; error: PlaybackActionError }> {
  const parsed = codeSchema.safeParse(inviteCode);
  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };
  if (!parsed.success) return { ok: false, error: "not_found" };

  const room = await getWatchTogetherRoom(parsed.data);
  if (!room) return { ok: false, error: "not_found" };
  if (!room.participants.some((p) => p.userId === auth.user.id))
    return { ok: false, error: "forbidden" };

  const { data, error } = await auth.supabase
    .from("watch_session_playback")
    .select("status, current_time, playback_rate, updated_at, sequence")
    .eq("session_id", room.id)
    .maybeSingle();

  if (error) return { ok: false, error: "failed" };

  const state: PlaybackState | null = data
    ? {
        sessionId: room.id,
        status: data.status,
        currentTime: Number(data.current_time),
        playbackRate: Number(data.playback_rate),
        updatedAt: data.updated_at,
        sequence: Number(data.sequence),
      }
    : null;

  return { ok: true, state };
}

/**
 * Host-only update of the shared playback state. RLS restricts writes to the
 * host, but we also enforce host ownership here for defense in depth. The
 * caller must pass the last known `sequence` so stale/duplicated writes are
 * rejected server-side via the trigger's monotonically increasing sequence.
 */
export async function updatePlaybackState(
  inviteCode: string,
  input: z.infer<typeof playbackStateSchema>,
): Promise<{ ok: true; state: PlaybackState } | { ok: false; error: PlaybackActionError }> {


  const parsed = codeSchema.safeParse(inviteCode);
  const parsedInput = playbackStateSchema.safeParse(input);
  const auth = await prerequisites();
  if (!auth) return { ok: false, error: missingPrerequisiteError() };
  if (!parsed.success || !parsedInput.success) return { ok: false, error: "failed" };

  const room = await getWatchTogetherRoom(parsed.data);
  if (!room) return { ok: false, error: "not_found" };
  if (room.hostUserId !== auth.user.id) return { ok: false, error: "forbidden" };

  const { data, error } = await auth.supabase
    .from("watch_session_playback")
    .upsert(
      {
        session_id: room.id,
        status: parsedInput.data.status,
        current_time: parsedInput.data.currentTime,
        playback_rate: parsedInput.data.playbackRate,
        sequence: parsedInput.data.sequence,
      },
      { onConflict: "session_id" },
    )
    .select("status, current_time, playback_rate, updated_at, sequence")
    .single();

  if (error || !data) return { ok: false, error: "failed" };

  return {
    ok: true,
    state: {
      sessionId: room.id,
      status: data.status,
      currentTime: Number(data.current_time),
      playbackRate: Number(data.playback_rate),
      updatedAt: data.updated_at,
      sequence: Number(data.sequence),
    },
  };
}

