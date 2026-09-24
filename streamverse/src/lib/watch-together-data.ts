import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeResponses } from "@/lib/watch-together";
import type { WatchTogetherRoom } from "@/types/watch-together";
// WT-4 normalized queue read-model is implemented in src/lib/watch-together-queue-data.ts


type SessionRow = {
  id: string;
  invite_code: string;
  name: string;
  status: "open" | "closed" | "ended";
  host_user_id: string | null;
  created_at: string;
  is_public: boolean;
  max_participants: number;
  media_type: "movie" | "tv" | "anime" | null;
  media_id: string | null;
  description: string | null;
};
type ParticipantRow = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  is_ready: boolean;
  joined_at: string;
  responses: unknown;
};
type ResultRow = { media_type: string; media_id: string; rank: number | null; reason: string | null };

export async function getWatchTogetherRoom(inviteCode: string): Promise<WatchTogetherRoom | null> {
  const supabase = await createSupabaseServerClient();
  const { data: session, error } = await supabase
    .from("watch_sessions")
    .select(
      "id, invite_code, name, status, host_user_id, created_at, is_public, max_participants, media_type, media_id, description"
    )
    .eq("invite_code", inviteCode)
    .maybeSingle();
  if (error || !session) return null;
  const [{ data: participants }, { data: results }] = await Promise.all([
    supabase
      .from("watch_session_participants")
      .select("id, user_id, display_name, is_ready, joined_at, responses")
      .eq("session_id", session.id)
      .order("joined_at"),
    supabase
      .from("watch_session_results")
      .select("media_type, media_id, rank, reason")
      .eq("session_id", session.id)
      .order("rank"),
  ]);
  const row = session as SessionRow;
  return {
    id: row.id,
    inviteCode: row.invite_code,
    name: row.name,
    status: row.status,
    hostUserId: row.host_user_id,
    createdAt: row.created_at,
    isPublic: row.is_public ?? false,
    maxParticipants: row.max_participants ?? 10,
    mediaType: row.media_type,
    mediaId: row.media_id,
    description: row.description,
    participants: ((participants ?? []) as ParticipantRow[]).map((participant) => ({
      id: participant.id,
      userId: participant.user_id,
      displayName: participant.display_name || "Guest",
      isReady: participant.is_ready,
      joinedAt: participant.joined_at,
      responses: normalizeResponses(participant.responses),
    })),
    results: ((results ?? []) as ResultRow[]).map((result) => ({
      mediaType: result.media_type,
      mediaId: result.media_id,
      rank: result.rank ?? 0,
      reason: result.reason ?? "",
    })),
  };
}



/**
 * Get all public rooms for the room browser.
 * Only returns rooms that are open and not full.
 */
export interface PublicWatchTogetherRoom {
  id: string;
  inviteCode: string;
  name: string;
  hostUserId: string | null;
  isPublic: boolean;
  maxParticipants: number;
  mediaType: "movie" | "tv" | "anime" | null;
  mediaId: string | null;
  description: string | null;
  participantCount: number;
}

export async function getPublicWatchTogetherRooms(): Promise<PublicWatchTogetherRoom[]> {
  const supabase = await createSupabaseServerClient();
  const { data: sessions, error } = await supabase
    .from("watch_sessions")
    .select(
      `id, invite_code, name, host_user_id, is_public, max_participants, media_type, media_id, description,
       watch_session_participants(count)`
    )
    .eq("is_public", true)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error || !sessions) return [];

  return sessions.map((s) => ({
    id: s.id,
    inviteCode: s.invite_code,
    name: s.name,
    hostUserId: s.host_user_id,
    isPublic: s.is_public,
    maxParticipants: s.max_participants,
    mediaType: s.media_type,
    mediaId: s.media_id,
    description: s.description,
    participantCount: s.watch_session_participants?.[0]?.count ?? 0,
  }));
}

