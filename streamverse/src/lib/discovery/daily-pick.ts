"use server";

import { isSupabaseConfigured, isTmdbConfigured, isAIConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { safeList } from "@/lib/safe";
import { getTrendingAll, getTrendingMovies, getTrendingTv, getPopularMovies, getTopRatedMovies } from "@/lib/adapters/tmdb";
import { getPersonalizationContext } from "@/lib/ai/personal-context";
import { generateDailyAiPick } from "@/lib/ai/picks";
import type { MediaItem } from "@/types/media-item";
import type { AiPick } from "@/types/ai-picks";

export interface DailyPick {
  movie: MediaItem | null;
  tvShow: MediaItem | null;
  hiddenGem: MediaItem | null;
  trending: MediaItem | null;
  aiPick: AiPick | null;
  date: string;
}

import { LRUCache } from "lru-cache";

/**
 * In-memory per-user daily AI pick cache.
 * Key: `${userId}:${date}` → avoids re-calling the AI on every render.
 * Cleared naturally when the server restarts or the date rolls over.
 */
const aiPickCache = new LRUCache<string, { pick: AiPick | null }>({ max: 200 });

export async function getDailyPick(): Promise<DailyPick> {
  const date = new Date().toISOString().split("T")[0];

  if (!isTmdbConfigured()) {
    return { movie: null, tvShow: null, hiddenGem: null, trending: null, aiPick: null, date };
  }

  try {
    const [trending, movies, tvShows, popular, topRated] = await Promise.all([
      safeList(() => getTrendingAll(1)),
      safeList(() => getTrendingMovies(1)),
      safeList(() => getTrendingTv(1)),
      safeList(() => getPopularMovies(1)),
      safeList(() => getTopRatedMovies(1)),
    ]);

    // Use deterministic seed based on date
    const daySeed = date.split("-").reduce((acc, n) => acc + parseInt(n, 10), 0);

    // Attempt AI pick generation (non-blocking for the rest of Daily Discovery)
    let aiPick: AiPick | null = null;
    if (isAIConfigured() && isSupabaseConfigured()) {
      try {
        const user = await getCurrentUser();
        if (user) {
          const cacheKey = `${user.id}:${date}`;
          if (aiPickCache.has(cacheKey)) {
            aiPick = aiPickCache.get(cacheKey)?.pick ?? null;
          } else {
            const context = await getPersonalizationContext(user.id);
            aiPick = await generateDailyAiPick(context);
            aiPickCache.set(cacheKey, { pick: aiPick });
          }
        }
      } catch (e) {
        console.warn("Daily AI pick generation failed (continuing without AI pick):", e);
        aiPick = null;
      }
    }

    return {
      movie: movies.length > 0 ? movies[daySeed % movies.length] : null,
      tvShow: tvShows.length > 0 ? tvShows[daySeed % tvShows.length] : null,
      hiddenGem: topRated.length > 4 ? topRated[4 + (daySeed % Math.min(10, topRated.length - 4))] : (topRated.length > 0 ? topRated[0] : null),
      trending: trending.length > 0 ? trending[daySeed % trending.length] : null,
      aiPick,
      date,
    };
  } catch {
    return { movie: null, tvShow: null, hiddenGem: null, trending: null, aiPick: null, date };
  }
}

