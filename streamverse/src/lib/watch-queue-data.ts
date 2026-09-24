import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type WatchQueueStatus = "pending" | "watching" | "watched";
export type WatchQueuePriority = "high" | "medium" | "low";

export interface WatchQueueItem {
  id: string;
  tmdbId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  status: WatchQueueStatus;
  addedAt: string;
  watchedAt: string | null;
  updatedAt: string;

  priority: WatchQueuePriority;
  personalRating: number | null;
  notes: string | null;
  favorite: boolean;
}

export interface WatchQueueStats {
  movies: number;
  tv: number;
  pending: number;
  watching: number;
  watched: number;
  total: number;
  completed: number;
}

function mapRow(row: any): WatchQueueItem {
  // Raw DB columns are not all present in the SQL migration that exists
  // in this repo snapshot. Default any missing fields to safe values.
  const priority = (row.priority as WatchQueuePriority | null) ?? "medium";
  const personalRating = typeof row.personal_rating === "number" ? row.personal_rating : null;

  return {
    id: String(row.id),
    tmdbId: String(row.tmdb_id),
    mediaType: row.media_type as "movie" | "tv",
    title: String(row.title),
    posterPath: row.poster_path ?? null,
    releaseDate: row.release_date ?? null,
    status: row.status as WatchQueueStatus,
    addedAt: String(row.added_at),
    watchedAt: row.watched_at ?? null,
    updatedAt: String(row.updated_at),

    priority,
    personalRating,
    notes: row.notes ?? null,
    favorite: Boolean(row.favorite ?? false),
  };
}

function isWatchQueuePriority(value: string): value is WatchQueuePriority {
  return value === "high" || value === "medium" || value === "low";
}

export async function getWatchQueue(userId?: string): Promise<WatchQueueItem[]> {
  if (!isSupabaseConfigured()) return [];

  const user = userId ? { id: userId } : await getCurrentUser();
  if (!user || !user.id) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("watch_queue")
    .select(
      "id, tmdb_id, media_type, title, poster_path, release_date, status, added_at, watched_at, updated_at, priority, personal_rating, notes, favorite",
    )
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  if (error || !data) return [];
  return (data as any[]).map(mapRow);
}

export async function getWatchQueueStats(): Promise<WatchQueueStats> {
  if (!isSupabaseConfigured()) return {
    movies: 0,
    tv: 0,
    pending: 0,
    watching: 0,
    watched: 0,
    total: 0,
    completed: 0,
  };

  const user = await getCurrentUser();
  if (!user) {
    return {
      movies: 0,
      tv: 0,
      pending: 0,
      watching: 0,
      watched: 0,
      total: 0,
      completed: 0,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("watch_queue")
    .select("media_type, status")
    .eq("user_id", user.id);

  if (error || !data) {
    return {
      movies: 0,
      tv: 0,
      pending: 0,
      watching: 0,
      watched: 0,
      total: 0,
      completed: 0,
    };
  }

  const rows = data as Array<{ media_type: string; status: WatchQueueStatus }>;

  const movies = rows.filter((r) => r.media_type === "movie").length;
  const tv = rows.filter((r) => r.media_type === "tv").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const watching = rows.filter((r) => r.status === "watching").length;
  const watched = rows.filter((r) => r.status === "watched").length;

  return {
    movies,
    tv,
    pending,
    watching,
    watched,
    total: rows.length,
    completed: watched,
  };
}

export async function addToWatchQueue(input: {
  tmdbId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  releaseDate?: string | null;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("watch_queue").upsert(
    {
      user_id: user.id,
      tmdb_id: input.tmdbId,
      media_type: input.mediaType,
      title: input.title,
      poster_path: input.posterPath ?? null,
      release_date: input.releaseDate ?? null,
      status: "pending" as WatchQueueStatus,
    },
    {
      onConflict: "user_id,media_type,tmdb_id",
    },
  );

  if (error) return false;
  return true;
}

export async function removeFromWatchQueue(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("watch_queue").delete().eq("id", id).eq("user_id", user.id);
  return !error;
}

export async function updateWatchQueueStatus(input: {
  id: string;
  status: WatchQueueStatus;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const watchedAt = input.status === "watched" ? new Date().toISOString() : null;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("watch_queue")
    .update({ status: input.status, watched_at: watchedAt })
    .eq("id", input.id)
    .eq("user_id", user.id);

  return !error;
}

export async function updateWatchQueuePriority(input: {
  id: string;
  priority: WatchQueuePriority;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("watch_queue")
    .update({ priority: input.priority })
    .eq("id", input.id)
    .eq("user_id", user.id);

  return !error;
}

export async function updateWatchQueueRating(input: {
  id: string;
  rating: number | null;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("watch_queue")
    .update({ personal_rating: input.rating })
    .eq("id", input.id)
    .eq("user_id", user.id);

  return !error;
}

export async function updateWatchQueueNotes(input: {
  id: string;
  notes: string | null;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("watch_queue")
    .update({ notes: input.notes })
    .eq("id", input.id)
    .eq("user_id", user.id);

  return !error;
}

export async function toggleFavorite(input: { id: string }): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("watch_queue")
    .select("favorite")
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return false;

  const next = !Boolean((data as any).favorite);

  const { error: updateError } = await supabase
    .from("watch_queue")
    .update({ favorite: next })
    .eq("id", input.id)
    .eq("user_id", user.id);

  return !updateError;
}

