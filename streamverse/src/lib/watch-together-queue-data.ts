import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  RankedSharedQueueItem,
  SharedQueueItemView,
  SharedQueueVoteValue,
} from "@/lib/watch-together-queue";
import {
  computeSharedQueueScore,
  rankSharedQueueItems,
} from "@/lib/watch-together-queue";

type QueueRow = {
  id: string;
  session_id: string;
  media_type: "movie" | "tv" | "anime";
  media_id: string;
  title: string;
  poster_url: string | null;
  suggested_by_user_id: string;
  created_at: string;
};

type VoteRow = {
  id: string;
  queue_item_id: string;
  user_id: string;
  vote: SharedQueueVoteValue;
  created_at: string;
  updated_at: string;
};

type ProfilesRow = {
  id: string;
  full_name: string | null;
};

function toSharedQueueItemView(params: {
  row: QueueRow;
  upvotes: number;
  downvotes: number;
  currentUserVote: SharedQueueVoteValue | 0;
  suggestedByDisplayName?: string | null;
}): SharedQueueItemView {
  const score = computeSharedQueueScore(params.upvotes, params.downvotes);
  return {
    id: params.row.id,
    sessionId: params.row.session_id,
    mediaType: params.row.media_type,
    mediaId: params.row.media_id,
    title: params.row.title,
    poster: params.row.poster_url,
    suggestedBy: params.row.suggested_by_user_id,
    suggestedByDisplayName: params.suggestedByDisplayName ?? null,
    createdAt: params.row.created_at,
    upvotes: params.upvotes,
    downvotes: params.downvotes,
    score,
    currentUserVote: params.currentUserVote,
    selected: false,
  };
}




export async function getSharedQueueItems(params: {
  sessionId: string;
  currentUserId: string;
}): Promise<RankedSharedQueueItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data: queueRows, error: queueError } = await supabase
    .from("watch_session_queue")
    .select(
      "id, session_id, media_type, media_id, title, poster_url, suggested_by_user_id, created_at"
    )
    .eq("session_id", params.sessionId)
    .order("created_at", { ascending: true });

  if (queueError || !queueRows) return [];

  if (queueRows.length === 0) return [];

  const queueItemIds = queueRows.map((r) => r.id);

  const { data: voteRows, error: voteError } = await supabase
    .from("watch_session_queue_votes")
    .select("id, queue_item_id, user_id, vote, created_at, updated_at")
    .in("queue_item_id", queueItemIds);

  if (voteError) return [];

  const voteAggByItem = new Map<
    string,
    { upvotes: number; downvotes: number; currentUserVote: SharedQueueVoteValue | 0 }
  >();
  for (const q of queueRows) {
    voteAggByItem.set(q.id, { upvotes: 0, downvotes: 0, currentUserVote: 0 });
  }

  for (const v of voteRows ?? []) {
    const agg = voteAggByItem.get(v.queue_item_id);
    if (!agg) continue;

    if (v.vote === 1) agg.upvotes += 1;
    else agg.downvotes += 1;

    if (v.user_id === params.currentUserId) {
      agg.currentUserVote = v.vote;
    }
  }

  const suggestedByIds = Array.from(
    new Set(queueRows.map((r) => r.suggested_by_user_id)),
  );

  let suggestedNameById = new Map<string, string>();
  if (suggestedByIds.length > 0) {
    const { data: profilesRows } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", suggestedByIds);

    if (profilesRows) {
      suggestedNameById = new Map(
        (profilesRows as ProfilesRow[]).map((p) => [p.id, p.full_name ?? ""]),
      );
    }
  }

  const { data: selectedRow } = await supabase
    .from("watch_sessions")
    .select("media_type, media_id")
    .eq("id", params.sessionId)
    .maybeSingle();

  const selectedMediaType = (selectedRow?.media_type as unknown as string | null) ?? null;
  const selectedMediaId = selectedRow?.media_id ?? null;

  const views: SharedQueueItemView[] = queueRows.map((row) => {
    const agg = voteAggByItem.get(row.id) ?? {
      upvotes: 0,
      downvotes: 0,
      currentUserVote: 0,
    };

    const selected =
      selectedMediaType !== null && selectedMediaId !== null
        ? row.media_type === selectedMediaType &&
          String(row.media_id) === String(selectedMediaId)
        : false;

    const view = toSharedQueueItemView({
      row,
      upvotes: agg.upvotes,
      downvotes: agg.downvotes,
      currentUserVote: agg.currentUserVote,
      suggestedByDisplayName:
        suggestedNameById.get(row.suggested_by_user_id) ?? null,
    });

    return { ...view, selected };
  });

  return rankSharedQueueItems(views);
}

export async function getSelectedQueueMedia(params: { sessionId: string }): Promise<{
  mediaType: string | null;
  mediaId: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("watch_sessions")
    .select("media_type, media_id")
    .eq("id", params.sessionId)
    .maybeSingle();

  if (error || !data) return { mediaType: null, mediaId: null };
  return {
    mediaType: (data.media_type as string) ?? null,
    mediaId: (data.media_id as string) ?? null,
  };
}

