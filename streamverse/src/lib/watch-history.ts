import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { WatchHistoryEntry, WatchHistoryGroup, WatchHistoryRow } from "@/types/profile";

// ---------------------------------------------------------------------------
// MAPPERS
// ---------------------------------------------------------------------------

export function mapWatchHistoryRow(row: WatchHistoryRow): WatchHistoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    mediaType: row.media_type,
    mediaId: row.media_id,
    title: row.title,
    coverImageUrl: row.cover_image_url,
    watchedAt: row.watched_at,
    durationMinutes: row.duration_minutes,
    rating: row.rating,
  };
}

// ---------------------------------------------------------------------------
// FETCHERS
// ---------------------------------------------------------------------------

/**
 * Returns watch history for the current user, ordered by most recent first.
 */
export async function getWatchHistory(options?: {
  mediaType?: string;
  limit?: number;
}): Promise<WatchHistoryEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("watch_history")
    .select("*")
    .eq("user_id", user.id)
    .order("watched_at", { ascending: false });

  if (options?.mediaType) {
    query = query.eq("media_type", options.mediaType);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as WatchHistoryRow[]).map(mapWatchHistoryRow);
}

/**
 * Returns watch history grouped by date label (Today, Yesterday, Monday, etc.)
 */
export async function getGroupedWatchHistory(options?: {
  mediaType?: string;
  limit?: number;
}): Promise<WatchHistoryGroup[]> {
  const entries = await getWatchHistory(options);
  if (!entries.length) return [];

  const groups = new Map<string, WatchHistoryEntry[]>();

  for (const entry of entries) {
    const date = new Date(entry.watchedAt);
    const label = getDateLabel(date);
    const dateKey = date.toISOString().split("T")[0];

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(entry);
  }

  const result: WatchHistoryGroup[] = [];
  for (const [dateKey, groupEntries] of groups) {
    const date = new Date(dateKey + "T00:00:00Z");
    result.push({
      date: dateKey,
      label: getDateLabel(date),
      entries: groupEntries,
    });
  }

  return result.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Log a watched title to history.
 */
export async function logWatchHistory(input: {
  mediaType: string;
  mediaId: string;
  title: string;
  coverImageUrl?: string | null;
  durationMinutes?: number | null;
  rating?: number | null;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("watch_history").insert({
    user_id: user.id,
    media_type: input.mediaType,
    media_id: input.mediaId,
    title: input.title,
    cover_image_url: input.coverImageUrl ?? null,
    duration_minutes: input.durationMinutes ?? null,
    rating: input.rating ?? null,
  });

  return !error;
}

/**
 * Remove a watch history entry.
 */
export async function removeWatchHistoryEntry(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("watch_history")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return !error;
}

/**
 * Clear all watch history.
 */
export async function clearWatchHistory(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("watch_history")
    .delete()
    .eq("user_id", user.id);

  return !error;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function getDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (diffDays < 7) return dayNames[target.getDay()];

  return target.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}