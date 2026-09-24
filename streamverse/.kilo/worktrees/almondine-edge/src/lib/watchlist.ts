import "server-only";

import type { MediaItem } from "@/types/media-item";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getMediaDetail } from "@/lib/adapters/registry";

export interface WatchlistRow {
  media_type: string;
  media_id: string;
  added_at: string;
}

/** Set of `${media_type}:${media_id}` keys in the current user's watchlist. */
export async function getWatchlistKeys(): Promise<Set<string>> {
  if (!isSupabaseConfigured()) return new Set();
  const user = await getCurrentUser();
  if (!user) return new Set();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("watchlist")
    .select("media_type, media_id")
    .eq("user_id", user.id);

  return new Set((data ?? []).map((r) => `${r.media_type}:${r.media_id}`));
}

export async function isInWatchlist(
  mediaType: string,
  mediaId: string,
): Promise<boolean> {
  const keys = await getWatchlistKeys();
  return keys.has(`${mediaType}:${mediaId}`);
}

/**
 * Resolve the current user's watchlist into full MediaItems by hydrating each
 * row through the adapter layer (cached), so the watchlist renders like any
 * other media grid.
 */
export async function getWatchlistItems(): Promise<MediaItem[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("watchlist")
    .select("media_type, media_id, added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const rows = (data ?? []) as WatchlistRow[];

  const items = await Promise.all(
    rows.map(async (row) => {
      try {
        const detail = await getMediaDetail(row.media_type, row.media_id);
        return detail as MediaItem | null;
      } catch {
        return null;
      }
    }),
  );

  return items.filter((item): item is MediaItem => item !== null);
}
