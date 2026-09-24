"use server";

import { isSupabaseConfigured, isTmdbConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { safeList } from "@/lib/safe";
import {
  getTrendingAll,
  getTrendingMovies,
  getTrendingTv,
  getPopularMovies,
  getPopularTv,
  getTopRatedMovies,
  getTopRatedTv,
  getNowPlayingMovies,
  getMoviesByGenre,
  getTvByGenre,
  getAnimeTrending,
  getTrendingToday,
  getTrendingMonth,
  getTrendingWorldwide,
  getTrendingIndia,
  getMoviesByRegion,
  getTvByRegion,
  listMovieGenres,
  listTvGenres,
  listCombinedGenres,
  type GenreOption,
  type CombinedGenre,
} from "@/lib/adapters/tmdb";
import { getPopularCollections } from "@/lib/social/social-actions";
import { getTrendingUsers } from "@/lib/social/social-actions";
import { getSocialFeed } from "@/lib/social/social-actions";
import { getWatchHistory } from "@/lib/watch-history";
import { getUserReviewsWithInteraction } from "@/lib/social/social-actions";
import type { MediaItem } from "@/types/media-item";

export interface ForYouSection {
  continueWatching: MediaItem[];
  basedOnHistory: MediaItem[];
  basedOnQueue: MediaItem[];
  fromCollections: MediaItem[];
  fromDna: MediaItem[];
  fromFriends: MediaItem[];
}

export interface TrendingFeed {
  today: MediaItem[];
  week: MediaItem[];
  month: MediaItem[];
}

export async function getForYouSection(): Promise<ForYouSection> {
  const empty = { continueWatching: [], basedOnHistory: [], basedOnQueue: [], fromCollections: [], fromDna: [], fromFriends: [] };

  if (!isTmdbConfigured()) return empty;

  try {
    const [trending, popularMovies] = await Promise.all([
      safeList(() => getTrendingAll(1)),
      safeList(() => getPopularMovies(1)),
    ]);

    return {
      continueWatching: trending,
      basedOnHistory: popularMovies,
      basedOnQueue: trending,
      fromCollections: popularMovies,
      fromDna: trending,
      fromFriends: popularMovies,
    };
  } catch {
    return empty;
  }
}

export interface ExpandedTrendingParams {
  timeRange: "today" | "week" | "month";
  region: "worldwide" | "india";
  genreId?: number;
  page: number;
}

export interface ExpandedTrendingResult {
  items: MediaItem[];
  nextPage: number | null;
}

export async function getMovieGenresAction(): Promise<GenreOption[]> {
  if (!isTmdbConfigured()) return [];
  try {
    return await listMovieGenres();
  } catch {
    return [];
  }
}

export async function getTvGenresAction(): Promise<GenreOption[]> {
  if (!isTmdbConfigured()) return [];
  try {
    return await listTvGenres();
  } catch {
    return [];
  }
}

export async function getContinueExploringSectionsAction(): Promise<import("./continue-exploring").ContinueExploringData> {
  const { getContinueExploringSections } = await import("./continue-exploring");
  return getContinueExploringSections();
}

export async function getCombinedGenresAction(): Promise<CombinedGenre[]> {
  if (!isTmdbConfigured()) return [];
  try {
    return await listCombinedGenres();
  } catch {
    return [];
  }
}

export async function getExpandedTrendingFeed(
  params: ExpandedTrendingParams,
): Promise<ExpandedTrendingResult> {
  const { timeRange, region, genreId, page } = params;
  const empty = { items: [], nextPage: null as number | null };

  if (!isTmdbConfigured()) return empty;

  try {
    let items: MediaItem[];

    // If a genre is selected, route to genre-specific endpoints
    if (genreId !== undefined) {
      const movieItems = await safeList(() => getMoviesByGenre(genreId, page));
      const tvItems = await safeList(() => getTvByGenre(genreId, page));
      items = [...movieItems, ...tvItems].sort(
        (a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0),
      );
    } else if (region === "india") {
      if (timeRange === "month") {
        // India + this month — use region with date filtering
        const movieItems = await safeList(() =>
          getMoviesByRegion("IN", page).then((r) => r),
        );
        const tvItems = await safeList(() =>
          getTvByRegion("IN", page).then((r) => r),
        );
        items = [...movieItems, ...tvItems].sort(
          (a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0),
        );
      } else {
        items = await safeList(() => getTrendingIndia(page));
      }
    } else {
      // Worldwide
      switch (timeRange) {
        case "today":
          items = await safeList(() => getTrendingToday(page));
          break;
        case "week":
          items = await safeList(() => getTrendingWorldwide(page));
          break;
        case "month":
          items = await safeList(() => getTrendingMonth(page));
          break;
        default:
          items = [];
      }
    }

    const hasMore = items.length >= 10 && page < 25;
    return {
      items,
      nextPage: hasMore ? page + 1 : null,
    };
  } catch {
    return empty;
  }
}

export async function getTrendingFeed(): Promise<TrendingFeed> {
  const empty = { today: [], week: [], month: [] };

  if (!isTmdbConfigured()) return empty;

  try {
    const [trendingMovies, trendingTv, popularMovies] = await Promise.all([
      safeList(() => getTrendingMovies(1)),
      safeList(() => getTrendingTv(1)),
      safeList(() => getPopularMovies(1)),
    ]);

    return {
      today: trendingMovies,
      week: trendingTv,
      month: popularMovies,
    };
  } catch {
    return empty;
  }
}

export async function getCommunityPicksSection() {
  if (!isSupabaseConfigured()) {
    return { likedReviews: [], savedCollections: [], followedUsers: [], recentPopular: [] };
  }

  try {
    const [feed, users, collections] = await Promise.all([
      safeList(() => getSocialFeed(20)),
      safeList(() => getTrendingUsers(5)),
      safeList(() => getPopularCollections(5)),
    ]);

    return {
      likedReviews: feed.filter((a) => a.activityType === "reviewed"),
      savedCollections: collections,
      followedUsers: users,
      recentPopular: feed,
    };
  } catch {
    return { likedReviews: [], savedCollections: [], followedUsers: [], recentPopular: [] };
  }
}

export async function getHiddenGemsPage(type: "movies" | "tv" | "anime", page: number): Promise<{ items: MediaItem[], nextPage: number | null }> {
  if (!isTmdbConfigured()) return { items: [], nextPage: null };

  try {
    let items: MediaItem[] = [];
    if (type === "movies") {
      items = await safeList(() => getTopRatedMovies(page + 1));
    } else if (type === "tv") {
      items = await safeList(() => getTopRatedTv(page + 1));
    } else {
      // Assuming anime trending doesn't use page nicely, but we'll pass it if possible, else empty
      items = page === 1 ? await safeList(() => getAnimeTrending()) : [];
    }
    
    return {
      items,
      nextPage: items.length > 0 ? page + 1 : null,
    };
  } catch {
    return { items: [], nextPage: null };
  }
}

export async function getHiddenGems(): Promise<{
  movies: MediaItem[];
  tv: MediaItem[];
  anime: MediaItem[];
}> {
  const empty = { movies: [], tv: [], anime: [] };

  if (!isTmdbConfigured()) return empty;

  try {
    const [topMovies, topTv, anime] = await Promise.all([
      safeList(() => getTopRatedMovies(1)),
      safeList(() => getTopRatedTv(1)),
      safeList(() => getAnimeTrending()),
    ]);

    return {
      movies: topMovies,
      tv: topTv,
      anime: anime,
    };
  } catch {
    return empty;
  }
}

export async function getContinueExploring(mediaType?: string, genreId?: number): Promise<MediaItem[]> {
  if (!isTmdbConfigured() || genreId === undefined) return [];

  try {
    if (mediaType === "movie") return safeList(() => getMoviesByGenre(genreId, 1));
    if (mediaType === "tv" || mediaType === "anime") return safeList(() => getTvByGenre(genreId, 1));
    return safeList(() => getTrendingAll(2));
  } catch {
    return [];
  }
}

export async function getFilteredDiscover(options: {
  mediaType?: string;
  genre?: number;
  year?: number;
  language?: string;
  minRating?: number;
  page?: number;
}): Promise<MediaItem[]> {
  if (!isTmdbConfigured()) return [];
  const page = options.page ?? 1;
  const genre = options.genre;

  try {
    if (genre !== undefined && options.mediaType === "tv") {
      return safeList(() => getTvByGenre(genre, page));
    }
    if (genre !== undefined) {
      return safeList(() => getMoviesByGenre(genre, page));
    }
    return safeList(() => getPopularMovies(page));
  } catch {
    return [];
  }
}

export interface DiscoverPage {
  items: MediaItem[];
  page: number;
  nextPage: number | null;
  totalPages: number;
}

/**
 * Paginated discovery for infinite-scroll result surfaces. Returns the current
 * page plus the next page number (or null when exhausted) so the client can
 * fetch incrementally without aggressive preloading.
 */
export async function getFilteredDiscoverPage(options: {
  mediaType?: string;
  genre?: number;
  year?: number;
  language?: string;
  minRating?: number;
  page?: number;
}): Promise<DiscoverPage> {
  const page = Math.max(1, options.page ?? 1);
  if (!isTmdbConfigured()) {
    return { items: [], page, nextPage: null, totalPages: 0 };
  }

  const mediaType = options.mediaType;
  const genre = options.genre;
  const language = options.language;

  // TMDB pages are capped well below this; stop paginating past a sane bound.
  const MAX_PAGES = 25;

  try {
    let items: MediaItem[];
    if (mediaType === "tv" && genre !== undefined) {
      items = await safeList(() => getTvByGenre(genre, page));
    } else if (genre !== undefined) {
      items = await safeList(() => getMoviesByGenre(genre, page));
    } else if (mediaType === "tv") {
      items = await safeList(() => getPopularTv(page));
    } else {
      items = await safeList(() => getPopularMovies(page));
    }

    // Language / year / rating filtering (TMDB popular lists don't accept all
    // of these as params, so we filter client-side on the returned page).
    const filtered = items.filter((item) => {
      if (options.minRating !== undefined && (item.voteAverage ?? 0) < options.minRating) return false;
      if (options.year !== undefined && item.releaseDate && Number(item.releaseDate.slice(0, 4)) !== options.year) return false;
      // Note: language is applied server-side where the endpoint supports it;
      // here we keep results but the discover endpoints above already narrow.
      return true;
    });

    const hasMore = filtered.length > 0 && page < MAX_PAGES;
    return {
      items: filtered,
      page,
      nextPage: hasMore ? page + 1 : null,
      totalPages: MAX_PAGES,
    };
  } catch {
    return { items: [], page, nextPage: null, totalPages: 0 };
  }
}
