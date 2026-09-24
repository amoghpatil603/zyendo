import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { UserStats, UserStatsRow } from "@/types/profile";

// ---------------------------------------------------------------------------
// MAPPER
// ---------------------------------------------------------------------------

export function mapUserStatsRow(row: UserStatsRow): UserStats {
  return {
    userId: row.user_id,
    totalMoviesWatched: row.total_movies_watched,
    totalTvEpisodesWatched: row.total_tv_episodes_watched,
    totalAnimeEpisodesWatched: row.total_anime_episodes_watched,
    totalHoursWatched: Number(row.total_hours_watched),
    totalReviewsWritten: row.total_reviews_written,
    totalCollectionsCreated: row.total_collections_created,
    favoriteGenre: row.favorite_genre,
    favoriteActor: row.favorite_actor,
    favoriteDirector: row.favorite_director,
    averageRating: row.average_rating,
    currentMonthMovies: row.current_month_movies,
    currentMonthEpisodes: row.current_month_episodes,
  };
}

// ---------------------------------------------------------------------------
// STATS FETCHER
// ---------------------------------------------------------------------------

/**
 * Returns cached user stats. If no stats exist yet, they are computed on demand.
 */
export async function getUserStats(): Promise<UserStats | null> {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return null;

  if (!data) {
    return computeAndCacheStats(user.id);
  }

  return mapUserStatsRow(data as UserStatsRow);
}

/**
 * Compute user stats from source tables and cache them.
 */
export async function computeAndCacheStats(userId: string): Promise<UserStats | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthPad = String(currentMonth).padStart(2, "0");
  const monthStart = `${currentYear}-${monthPad}-01`;

  // Gather counts in parallel
  const [historyResult, reviewsResult, collectionsResult, ratingsResult, monthMoviesResult, monthEpisodesResult] =
    await Promise.all([
      supabase.from("watch_history").select("duration_minutes, media_type").eq("user_id", userId),
      supabase.from("reviews").select("id", { count: "exact", head: false }).eq("user_id", userId),
      supabase.from("collections").select("id", { count: "exact", head: false }).eq("user_id", userId),
      supabase.from("reviews").select("rating").eq("user_id", userId).not("rating", "is", null),
      supabase
        .from("watch_history")
        .select("id", { count: "exact", head: false })
        .eq("user_id", userId)
        .eq("media_type", "movie")
        .gte("watched_at", monthStart),
      supabase
        .from("watch_history")
        .select("id", { count: "exact", head: false })
        .eq("user_id", userId)
        .in("media_type", ["tv", "anime"])
        .gte("watched_at", monthStart),
    ]);

  const historyRows = (historyResult.data ?? []) as Array<{ duration_minutes: number | null; media_type: string }>;
  const ratingsData = (ratingsResult.data ?? []) as Array<{ rating: number | null }>;

  let totalMoviesWatched = 0;
  let totalTvEpisodesWatched = 0;
  let totalAnimeEpisodesWatched = 0;
  let totalHoursWatched = 0;

  for (const row of historyRows) {
    if (row.media_type === "movie") totalMoviesWatched++;
    else if (row.media_type === "tv") totalTvEpisodesWatched++;
    else if (row.media_type === "anime") totalAnimeEpisodesWatched++;
    if (row.duration_minutes) totalHoursWatched += row.duration_minutes / 60;
  }

  const ratings = ratingsData.map((r) => r.rating).filter((r): r is number => r !== null);
  const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const stats: UserStatsRow = {
    user_id: userId,
    total_movies_watched: totalMoviesWatched,
    total_tv_episodes_watched: totalTvEpisodesWatched,
    total_anime_episodes_watched: totalAnimeEpisodesWatched,
    total_hours_watched: Math.round(totalHoursWatched * 100) / 100,
    total_reviews_written: reviewsResult.count ?? 0,
    total_collections_created: collectionsResult.count ?? 0,
    favorite_genre: null,
    favorite_actor: null,
    favorite_director: null,
    average_rating: averageRating !== null ? Math.round(averageRating * 10) / 10 : null,
    current_month_movies: monthMoviesResult.count ?? 0,
    current_month_episodes: monthEpisodesResult.count ?? 0,
    last_calculated_at: now.toISOString(),
  };

  const { error } = await supabase.from("user_stats").upsert(stats, {
    onConflict: "user_id",
  });

  if (error) return null;

  return mapUserStatsRow(stats);
}