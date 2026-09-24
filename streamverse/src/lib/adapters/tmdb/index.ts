import "server-only";

import { cache } from "react";

import type { MediaDetail, MediaItem } from "@/types/media-item";
import { tmdbFetch, tmdbImageUrl } from "./client";
import { getCachedMediaDetail, setCachedMediaDetail, getCachedList, setCachedList } from "@/lib/db-cache";
import { getOrGenerateAiMetadata } from "@/lib/ai/content-analysis";
import {
  mapMovieSummary,
  mapTvSummary,
  mapMovieDetail,
  mapTvDetail,
  mapMovieDetailWithSubresources,
  mapTvDetailWithSubresources,
} from "./map";
import type {
  TmdbGenre,
  TmdbMovieDetail,
  TmdbMovieSummary,
  TmdbMultiResult,
  TmdbPaginated,
  TmdbSeasonDetail,
  TmdbTvDetail,
  TmdbTvSummary,
  TmdbCredits,
  TmdbWatchProviderRegion,
  TmdbVideo,
  TmdbPersonDetail,
} from "./types";

/** Default region for trending / where-to-watch. India per the PRD. */
export const DEFAULT_REGION = "IN";
export const DEFAULT_LANGUAGE = "en-US";

/** Cached genre lookups so summary lists can resolve genre names. */
const getMovieGenres = cache(async (): Promise<Map<number, string>> => {
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list", {
    params: { language: DEFAULT_LANGUAGE },
    revalidate: 86400,
  });
  return new Map(data.genres.map((g) => [g.id, g.name]));
});

const getTvGenres = cache(async (): Promise<Map<number, string>> => {
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/tv/list", {
    params: { language: DEFAULT_LANGUAGE },
    revalidate: 86400,
  });
  return new Map(data.genres.map((g) => [g.id, g.name]));
});

export interface GenreOption {
  id: number;
  name: string;
}

export interface CombinedGenre {
  name: string;
  movieGenreId?: number;
  tvGenreId?: number;
}

export async function listMovieGenres(): Promise<GenreOption[]> {
  const map = await getMovieGenres();
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

export async function listTvGenres(): Promise<GenreOption[]> {
  const map = await getTvGenres();
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

/**
 * Returns combined genres preserving separate movie/TV IDs.
 * When a genre exists in both lists with the same name but different IDs,
 * both IDs are preserved so the correct one can be used per media type.
 */
export async function listCombinedGenres(): Promise<CombinedGenre[]> {
  const [movieGenres, tvGenres] = await Promise.all([
    listMovieGenres(),
    listTvGenres(),
  ]);
  const movieMap = new Map(movieGenres.map((g) => [g.name, g.id]));
  const tvMap = new Map(tvGenres.map((g) => [g.name, g.id]));
  const allNames = new Set([...movieMap.keys(), ...tvMap.keys()]);
  return [...allNames]
    .map((name) => ({
      name,
      movieGenreId: movieMap.get(name),
      tvGenreId: tvMap.get(name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// --- Movies ----------------------------------------------------------------

async function movieList(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<MediaItem[]> {
  const queryKey = `movieList:${path}:${JSON.stringify(params)}`;
  const cached = await getCachedList<MediaItem[]>(queryKey);
  if (cached) return cached;

  try {
    const [data, genres] = await Promise.all([
      tmdbFetch<TmdbPaginated<TmdbMovieSummary>>(path, {
        params: { language: DEFAULT_LANGUAGE, ...params },
      }),
      getMovieGenres(),
    ]);
    const results = data.results.map((m) => mapMovieSummary(m, genres));
    await setCachedList(queryKey, results);
    return results;
  } catch (err) {
    console.error(`[TMDB] List Fetch Failed for ${path}, attempting stale fallback:`, err);
    const staleFallback = await getCachedList<MediaItem[]>(queryKey, 999999999);
    if (staleFallback) return staleFallback;
    return []; // Graceful empty state instead of crashing the page
  }
}

export const getPopularMovies = (page = 1, genreId?: number) => {
  if (genreId) {
    return movieList("/discover/movie", { page, sort_by: "popularity.desc", with_genres: genreId });
  }
  return movieList("/movie/popular", { page, region: DEFAULT_REGION });
};

export const getTopRatedMovies = (page = 1, genreId?: number) => {
  if (genreId) {
    return movieList("/discover/movie", { page, sort_by: "vote_average.desc", "vote_count.gte": 200, with_genres: genreId });
  }
  return movieList("/movie/top_rated", { page, region: DEFAULT_REGION });
};

export const getUpcomingMovies = (page = 1, genreId?: number) => {
  if (genreId) {
    const today = new Date().toISOString().split("T")[0];
    return movieList("/discover/movie", { page, sort_by: "popularity.desc", "primary_release_date.gte": today, with_genres: genreId });
  }
  return movieList("/movie/upcoming", { page, region: DEFAULT_REGION });
};

export const getNowPlayingMovies = (page = 1, genreId?: number) => {
  if (genreId) {
    const today = new Date();
    const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return movieList("/discover/movie", { 
      page, 
      sort_by: "popularity.desc", 
      "primary_release_date.gte": past.toISOString().split("T")[0], 
      "primary_release_date.lte": today.toISOString().split("T")[0], 
      with_release_type: "2|3", 
      with_genres: genreId 
    });
  }
  return movieList("/movie/now_playing", { page, region: DEFAULT_REGION });
};

export const getTrendingMovies = (page = 1, genreId?: number) => {
  if (genreId) {
    const today = new Date();
    const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return movieList("/discover/movie", { 
      page, 
      sort_by: "popularity.desc", 
      "primary_release_date.gte": past.toISOString().split("T")[0], 
      with_genres: genreId 
    });
  }
  return movieList("/trending/movie/week", { page });
};

export async function getMoviesByGenre(
  genreId: number,
  page = 1,
): Promise<MediaItem[]> {
  return movieList("/discover/movie", {
    with_genres: genreId,
    sort_by: "popularity.desc",
    page,
  });
}

/**
 * Discover movies released in the last N days, sorted by popularity.
 */
export async function getMoviesTrendingMonth(page = 1): Promise<MediaItem[]> {
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const gte = past.toISOString().split("T")[0];
  const lte = now.toISOString().split("T")[0];
  return movieList("/discover/movie", {
    "primary_release_date.gte": gte,
    "primary_release_date.lte": lte,
    sort_by: "popularity.desc",
    page,
  });
}

/**
 * Discover movies popular in a specific region.
 */
export async function getMoviesByRegion(
  region: string,
  page = 1,
): Promise<MediaItem[]> {
  return movieList("/discover/movie", {
    region,
    sort_by: "popularity.desc",
    page,
  });
}

/**
 * Get movie recommendations based on a movie ID.
 */
export async function getMovieRecommendations(
  movieId: number,
  page = 1,
): Promise<MediaItem[]> {
  return movieList(`/movie/${movieId}/recommendations`, { page });
}

/**
 * Get similar movies based on a movie ID.
 */
export async function getSimilarMovies(
  movieId: number,
  page = 1,
): Promise<MediaItem[]> {
  return movieList(`/movie/${movieId}/similar`, { page });
}

/**
 * Get movie credits (cast + crew) for a movie.
 */
export async function getMovieCredits(
  movieId: number,
): Promise<TmdbCredits> {
  return tmdbFetch<TmdbCredits>(`/movie/${movieId}/credits`, {
    params: { language: DEFAULT_LANGUAGE },
  });
}

export async function getMovieDetail(id: string): Promise<MediaDetail> {
  const cached = await getCachedMediaDetail(`movie-${id}`);
  if (cached) return cached;

  let basicData: TmdbMovieDetail;
  try {
    basicData = await tmdbFetch<TmdbMovieDetail>(`/movie/${id}`, {
      params: { language: DEFAULT_LANGUAGE },
      timeout: 10000,
      maxAttempts: 2,
    });
  } catch (err) {
    console.error(`[TMDB] Movie Details Failed for movie ${id}, attempting stale fallback:`, err);
    // STALE FALLBACK: Try to get the item from DB ignoring TTL
    const staleFallback = await getCachedMediaDetail(`movie-${id}`, 999999999);
    if (staleFallback) return staleFallback;
    throw err;
  }

  const [creditsRes, providersRes, videosRes, similarRes] = await Promise.allSettled([
    tmdbFetch<TmdbCredits>(`/movie/${id}/credits`, {
      params: { language: DEFAULT_LANGUAGE },
      timeout: 3000,
      maxAttempts: 1,
    }),
    tmdbFetch<{ results: Record<string, TmdbWatchProviderRegion> }>(`/movie/${id}/watch/providers`, {
      timeout: 3000,
      maxAttempts: 1,
    }),
    tmdbFetch<{ results: TmdbVideo[] }>(`/movie/${id}/videos`, {
      params: { language: DEFAULT_LANGUAGE },
      timeout: 3000,
      maxAttempts: 1,
    }),
    tmdbFetch<TmdbPaginated<TmdbMovieSummary>>(`/movie/${id}/similar`, {
      params: { language: DEFAULT_LANGUAGE },
      timeout: 3000,
      maxAttempts: 1,
    }),
  ]);

  if (creditsRes.status === "rejected") {
    console.warn(`[TMDB] Optional Resource Failed (credits) for movie ${id}:`, creditsRes.reason);
  }
  if (providersRes.status === "rejected") {
    console.warn(`[TMDB] Optional Resource Failed (providers) for movie ${id}:`, providersRes.reason);
  }
  if (videosRes.status === "rejected") {
    console.warn(`[TMDB] Optional Resource Failed (videos) for movie ${id}:`, videosRes.reason);
  }
  if (similarRes.status === "rejected") {
    console.warn(`[TMDB] Optional Resource Failed (similar) for movie ${id}:`, similarRes.reason);
  }

  const credits = creditsRes.status === "fulfilled" ? creditsRes.value : undefined;
  const watchProviders = providersRes.status === "fulfilled" ? providersRes.value : undefined;
  const videos = videosRes.status === "fulfilled" ? videosRes.value : undefined;
  const similar = similarRes.status === "fulfilled" ? similarRes.value : undefined;

  let mapped: MediaDetail;
  try {
    mapped = mapMovieDetailWithSubresources(basicData, DEFAULT_REGION, {
      credits,
      watchProviders,
      videos,
      similar,
    });
  } catch (err) {
    console.error(
      `[TMDB] Movie detail mapping failed for movie ${id}. Rendering basic details only.`,
      err,
    );
    mapped = mapMovieDetail(basicData, DEFAULT_REGION);
  }

  console.log(`[TMDB] Movie Rendered Successfully for movie ${id}`);
  await setCachedMediaDetail(`movie-${id}`, "movie", mapped);
  
  // Fire and forget AI analysis
  getOrGenerateAiMetadata(mapped).catch(() => {});

  return mapped;
}

// --- TV --------------------------------------------------------------------

async function tvList(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<MediaItem[]> {
  const queryKey = `tvList:${path}:${JSON.stringify(params)}`;
  const cached = await getCachedList<MediaItem[]>(queryKey);
  if (cached) return cached;

  try {
    const [data, genres] = await Promise.all([
      tmdbFetch<TmdbPaginated<TmdbTvSummary>>(path, {
        params: { language: DEFAULT_LANGUAGE, ...params },
      }),
      getTvGenres(),
    ]);
    const results = data.results.map((t) => mapTvSummary(t, genres));
    await setCachedList(queryKey, results);
    return results;
  } catch (err) {
    console.error(`[TMDB] TV List Fetch Failed for ${path}, attempting stale fallback:`, err);
    const staleFallback = await getCachedList<MediaItem[]>(queryKey, 999999999);
    if (staleFallback) return staleFallback;
    return []; // Graceful empty state
  }
}

export const getPopularTv = (page = 1, genreId?: number) => {
  if (genreId) {
    return tvList("/discover/tv", { page, sort_by: "popularity.desc", with_genres: genreId });
  }
  return tvList("/tv/popular", { page });
};

export const getTopRatedTv = (page = 1, genreId?: number) => {
  if (genreId) {
    return tvList("/discover/tv", { page, sort_by: "vote_average.desc", "vote_count.gte": 200, with_genres: genreId });
  }
  return tvList("/tv/top_rated", { page });
};

export const getAiringTodayTv = (page = 1, genreId?: number) => {
  if (genreId) {
    const today = new Date().toISOString().split("T")[0];
    return tvList("/discover/tv", { page, sort_by: "popularity.desc", "air_date.lte": today, "air_date.gte": today, with_genres: genreId });
  }
  return tvList("/tv/airing_today", { page });
};

export const getOnTheAirTv = (page = 1, genreId?: number) => {
  if (genreId) {
    const today = new Date();
    const future = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return tvList("/discover/tv", { page, sort_by: "popularity.desc", "air_date.gte": today.toISOString().split("T")[0], "air_date.lte": future.toISOString().split("T")[0], with_genres: genreId });
  }
  return tvList("/tv/on_the_air", { page });
};

export const getTrendingTv = (page = 1, genreId?: number) => {
  if (genreId) {
    const today = new Date();
    const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return tvList("/discover/tv", { page, sort_by: "popularity.desc", "first_air_date.gte": past.toISOString().split("T")[0], with_genres: genreId });
  }
  return tvList("/trending/tv/week", { page });
};

export async function getTvByGenre(
  genreId: number,
  page = 1,
): Promise<MediaItem[]> {
  return tvList("/discover/tv", {
    with_genres: genreId,
    sort_by: "popularity.desc",
    page,
  });
}

/**
 * Discover TV shows that first aired in the last 30 days, sorted by popularity.
 */
export async function getTvTrendingMonth(page = 1): Promise<MediaItem[]> {
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const gte = past.toISOString().split("T")[0];
  const lte = now.toISOString().split("T")[0];
  return tvList("/discover/tv", {
    "first_air_date.gte": gte,
    "first_air_date.lte": lte,
    sort_by: "popularity.desc",
    page,
  });
}

/**
 * Discover TV shows popular in a specific region.
 * TMDB discovery/tv supports watch_region to prefer content available in a region.
 */
export async function getTvByRegion(
  region: string,
  page = 1,
): Promise<MediaItem[]> {
  return tvList("/discover/tv", {
    watch_region: region,
    sort_by: "popularity.desc",
    page,
  });
}

/**
 * Get TV recommendations based on a TV show ID.
 */
export async function getTvRecommendations(
  tvId: number,
  page = 1,
): Promise<MediaItem[]> {
  return tvList(`/tv/${tvId}/recommendations`, { page });
}

/**
 * Get similar TV shows based on a TV show ID.
 */
export async function getSimilarTv(
  tvId: number,
  page = 1,
): Promise<MediaItem[]> {
  return tvList(`/tv/${tvId}/similar`, { page });
}

/**
 * Get TV credits (cast + crew) for a TV show.
 */
export async function getTvCredits(
  tvId: number,
): Promise<TmdbCredits> {
  return tmdbFetch<TmdbCredits>(`/tv/${tvId}/credits`, {
    params: { language: DEFAULT_LANGUAGE },
  });
}

// --- Person / Credits ------------------------------------------------------

export async function getPersonDetail(personId: number | string): Promise<TmdbPersonDetail> {
  return tmdbFetch<TmdbPersonDetail>(`/person/${personId}`, {
    params: { language: DEFAULT_LANGUAGE },
  });
}

/**
 * Get combined credits for a person (both movie and TV).
 */
export async function getPersonCombinedCredits(
  personId: number,
): Promise<MediaItem[]> {
  const [data, movieGenres, tvGenres] = await Promise.all([
    tmdbFetch<{
      cast: (TmdbMovieSummary & TmdbTvSummary & { media_type?: string })[];
      crew: (TmdbMovieSummary & TmdbTvSummary & { media_type?: string })[];
    }>(`/person/${personId}/combined_credits`, {
      params: { language: DEFAULT_LANGUAGE },
    }),
    getMovieGenres(),
    getTvGenres(),
  ]);

  const seen = new Set<string>();
  const items: MediaItem[] = [];

  for (const entry of [...data.cast, ...data.crew]) {
    const mediaType = entry.media_type || (entry.title ? "movie" : "tv");
    const id = `${mediaType}-${entry.id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    if (mediaType === "movie") {
      items.push(mapMovieSummary(entry, movieGenres));
    } else if (mediaType === "tv") {
      items.push(mapTvSummary(entry, tvGenres));
    }
  }

  return items.sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0));
}

// --- Collections / Franchises ----------------------------------------------

export interface TmdbCollection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: (TmdbMovieSummary & { media_type?: string })[];
}

/**
 * Get a movie collection (franchise) by ID.
 */
export async function getCollection(
  collectionId: number,
): Promise<TmdbCollection | null> {
  try {
    return await tmdbFetch<TmdbCollection>(`/collection/${collectionId}`, {
      params: { language: DEFAULT_LANGUAGE },
    });
  } catch {
    return null;
  }
}

/**
 * Get the collection ID for a movie from its detail.
 */
export async function getMovieCollectionId(
  movieId: number,
): Promise<number | null> {
  try {
    const data = await tmdbFetch<{ belongs_to_collection?: { id: number } | null }>(
      `/movie/${movieId}`,
      { params: { language: DEFAULT_LANGUAGE } },
    );
    return data.belongs_to_collection?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Get collection parts as MediaItems.
 */
export async function getCollectionItems(
  collectionId: number,
): Promise<MediaItem[]> {
  const collection = await getCollection(collectionId);
  if (!collection?.parts?.length) return [];

  const movieGenres = await getMovieGenres();
  return collection.parts.map((p) => mapMovieSummary(p, movieGenres));
}

// --- Anime (Discovery category mapped to TV/Movies) ------------------------

export const getAnimeTrending = (page = 1) =>
  tvList("/discover/tv", {
    with_genres: 16,
    with_original_language: "ja",
    sort_by: "popularity.desc",
    page,
  });

export const getAnimePopular = (page = 1) =>
  tvList("/discover/tv", {
    with_genres: 16,
    with_original_language: "ja",
    sort_by: "popularity.desc",
    page,
  });

export const getAnimeTopRated = (page = 1) =>
  tvList("/discover/tv", {
    with_genres: 16,
    with_original_language: "ja",
    sort_by: "vote_average.desc",
    "vote_count.gte": 200,
    page,
  });

export const getAnimeAiring = (page = 1) => {
  const today = new Date().toISOString().split("T")[0];
  return tvList("/discover/tv", {
    with_genres: 16,
    with_original_language: "ja",
    "air_date.lte": today,
    "air_date.gte": today,
    page,
  });
};

export const getAnimeUpcoming = (page = 1) => {
  const today = new Date().toISOString().split("T")[0];
  return tvList("/discover/tv", {
    with_genres: 16,
    with_original_language: "ja",
    "first_air_date.gte": today,
    sort_by: "popularity.desc",
    page,
  });
};

export const getAnimeMovies = (page = 1) =>
  movieList("/discover/movie", {
    with_genres: 16,
    with_original_language: "ja",
    sort_by: "popularity.desc",
    page,
  });

export async function getTvDetail(id: string): Promise<MediaDetail> {
  const cached = await getCachedMediaDetail(`tv-${id}`);
  if (cached) return cached;

  let basicData: TmdbTvDetail;
  try {
    basicData = await tmdbFetch<TmdbTvDetail>(`/tv/${id}`, {
      params: { language: DEFAULT_LANGUAGE },
      timeout: 10000,
      maxAttempts: 2,
    });
  } catch (err) {
    console.error(`[TMDB] TV Details Failed for TV ${id}, attempting stale fallback:`, err);
    const staleFallback = await getCachedMediaDetail(`tv-${id}`, 999999999);
    if (staleFallback) return staleFallback;
    throw err;
  }

  const [creditsRes, providersRes, videosRes, similarRes] = await Promise.allSettled([
    tmdbFetch<TmdbCredits>(`/tv/${id}/credits`, {
      params: { language: DEFAULT_LANGUAGE },
      timeout: 3000,
      maxAttempts: 1,
    }),
    tmdbFetch<{ results: Record<string, TmdbWatchProviderRegion> }>(`/tv/${id}/watch/providers`, {
      timeout: 3000,
      maxAttempts: 1,
    }),
    tmdbFetch<{ results: TmdbVideo[] }>(`/tv/${id}/videos`, {
      params: { language: DEFAULT_LANGUAGE },
      timeout: 3000,
      maxAttempts: 1,
    }),
    tmdbFetch<TmdbPaginated<TmdbTvSummary>>(`/tv/${id}/similar`, {
      params: { language: DEFAULT_LANGUAGE },
      timeout: 3000,
      maxAttempts: 1,
    }),
  ]);

  if (creditsRes.status === "rejected") {
    console.warn(`[TMDB] Optional Resource Failed (credits) for TV ${id}:`, creditsRes.reason);
  }
  if (providersRes.status === "rejected") {
    console.warn(`[TMDB] Optional Resource Failed (providers) for TV ${id}:`, providersRes.reason);
  }
  if (videosRes.status === "rejected") {
    console.warn(`[TMDB] Optional Resource Failed (videos) for TV ${id}:`, videosRes.reason);
  }
  if (similarRes.status === "rejected") {
    console.warn(`[TMDB] Optional Resource Failed (similar) for TV ${id}:`, similarRes.reason);
  }

  const credits = creditsRes.status === "fulfilled" ? creditsRes.value : undefined;
  const watchProviders = providersRes.status === "fulfilled" ? providersRes.value : undefined;
  const videos = videosRes.status === "fulfilled" ? videosRes.value : undefined;
  const similar = similarRes.status === "fulfilled" ? similarRes.value : undefined;

  let mapped: MediaDetail;
  try {
    mapped = mapTvDetailWithSubresources(basicData, DEFAULT_REGION, {
      credits,
      watchProviders,
      videos,
      similar,
    });
  } catch (err) {
    console.error(
      `[TMDB] TV detail mapping failed for TV ${id}. Rendering basic details only.`,
      err,
    );
    mapped = mapTvDetail(basicData, DEFAULT_REGION);
  }

  console.log(`[TMDB] TV Rendered Successfully for TV ${id}`);
  await setCachedMediaDetail(`tv-${id}`, "tv", mapped);
  
  // Fire and forget AI analysis
  getOrGenerateAiMetadata(mapped).catch(() => {});

  return mapped;
}

export interface EpisodeSummary {
  id: number;
  episodeNumber: number;
  name: string;
  overview: string;
  stillUrl: string | null;
  airDate?: string;
  runtimeMinutes?: number;
  voteAverage?: number;
}

export async function getTvSeason(
  tvId: string,
  seasonNumber: number,
): Promise<EpisodeSummary[]> {
  const data = await tmdbFetch<TmdbSeasonDetail>(
    `/tv/${tvId}/season/${seasonNumber}`,
    { params: { language: DEFAULT_LANGUAGE } },
  );
  return (data.episodes ?? []).map((e) => ({
    id: e.id,
    episodeNumber: e.episode_number,
    name: e.name,
    overview: e.overview,
    stillUrl: tmdbImageUrl(e.still_path, "w300"),
    airDate: e.air_date ?? undefined,
    runtimeMinutes: e.runtime ?? undefined,
    voteAverage: e.vote_average,
  }));
}

// --- Trending (mixed) & search --------------------------------------------

export async function getTrendingAll(page = 1): Promise<MediaItem[]> {
  const [data, movieGenres, tvGenres] = await Promise.all([
    tmdbFetch<TmdbPaginated<TmdbMultiResult>>("/trending/all/week", {
      params: { page },
    }),
    getMovieGenres(),
    getTvGenres(),
  ]);
  return data.results
    .map((r): MediaItem | null => {
      if (r.media_type === "movie") return mapMovieSummary(r, movieGenres);
      if (r.media_type === "tv") return mapTvSummary(r, tvGenres);
      return null;
    })
    .filter((item): item is MediaItem => item !== null);
}

/**
 * "Today" trending — combines now_playing movies + airing today TV.
 * These are the best available "what's current" sources TMDB provides.
 */
export async function getTrendingToday(page = 1): Promise<MediaItem[]> {
  const [movies, tv] = await Promise.all([
    getNowPlayingMovies(page),
    getAiringTodayTv(page),
  ]);
  // Interleave results for variety, sorted by popularity
  const combined = [...movies, ...tv].sort(
    (a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0),
  );
  return combined.slice(0, 20);
}

/**
 * "This Month" trending — content released or first aired in the last 30 days.
 */
export async function getTrendingMonth(page = 1): Promise<MediaItem[]> {
  const [movies, tv] = await Promise.all([
    getMoviesTrendingMonth(page),
    getTvTrendingMonth(page),
  ]);
  const combined = [...movies, ...tv].sort(
    (a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0),
  );
  return combined.slice(0, 20);
}

/**
 * "Worldwide" trending — global trending/discovery results.
 */
export async function getTrendingWorldwide(page = 1): Promise<MediaItem[]> {
  return getTrendingAll(page);
}

/**
 * "India" trending — content popular in India.
 * Uses region=IN for movies and watch_region=IN for TV to surface what's
 * popular/available in India across all languages, not just Hindi.
 */
export async function getTrendingIndia(page = 1): Promise<MediaItem[]> {
  const [movies, tv] = await Promise.all([
    getMoviesByRegion("IN", page),
    getTvByRegion("IN", page),
  ]);
  const combined = [...movies, ...tv].sort(
    (a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0),
  );
  return combined.slice(0, 20);
}

export interface SearchResults {
  movies: MediaItem[];
  tv: MediaItem[];
  anime: MediaItem[];
  actors: MediaItem[];
  all: MediaItem[];
  totalResults: number;
  totalPages: number;
}

/** Unified search across movies + TV (people filtered out for Phase 1). */
export async function searchMulti(
  query: string,
  page = 1,
): Promise<SearchResults> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { movies: [], tv: [], anime: [], actors: [], all: [], totalResults: 0, totalPages: 0 };
  }
  
  const queryKey = `searchMulti:${trimmed}:${page}`;
  const cached = await getCachedList<SearchResults>(queryKey);
  if (cached) return cached;

  const [data, movieGenres, tvGenres] = await Promise.all([
    tmdbFetch<TmdbPaginated<TmdbMultiResult>>("/search/multi", {
      params: { query: trimmed, page, include_adult: false },
      revalidate: 0,
    }),
    getMovieGenres(),
    getTvGenres(),
  ]);

  const all: MediaItem[] = [];
  const movies: MediaItem[] = [];
  const tv: MediaItem[] = [];
  const anime: MediaItem[] = [];
  const actors: MediaItem[] = [];
  for (const r of data.results) {
    if (r.media_type === "movie") {
      movies.push(mapMovieSummary(r, movieGenres));
    } else if (r.media_type === "tv") {
      const isAnime = r.origin_country?.includes("JP") && r.genre_ids?.includes(16);
      if (isAnime) {
        anime.push(mapTvSummary(r, tvGenres));
      } else {
        tv.push(mapTvSummary(r, tvGenres));
      }
    } else if (r.media_type === "person") {
      const person: MediaItem = {
        id: `person-${r.id}`,
        type: "person",
        title: r.name,
        coverImageUrl: r.profile_path ? tmdbImageUrl(r.profile_path, "w500") : null,
        synopsis: r.known_for_department || "Person",
        source: "tmdb",
        externalId: String(r.id),
        genres: [],
        people: [],
      };
      actors.push(person);
    }
  }
  all.push(...movies, ...tv, ...anime, ...actors);
  all.sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0));
  const results = { movies, tv, anime, actors, all, totalResults: data.total_results, totalPages: data.total_pages };
  await setCachedList(queryKey, results);
  return results;
}

/** Fallback discovery for AI intent searches. */
export async function discoverMulti(
  mediaType: "movie" | "tv" | "multi",
  genreId: number | null,
  keywords: string | null,
  page = 1,
): Promise<SearchResults> {
  const [movieGenres, tvGenres] = await Promise.all([
    getMovieGenres(),
    getTvGenres(),
  ]);

  const all: MediaItem[] = [];
  const movies: MediaItem[] = [];
  const tv: MediaItem[] = [];
  const anime: MediaItem[] = [];
  const actors: MediaItem[] = [];

  let totalResults = 0;
  let totalPages = 0;

  if (mediaType === "movie" || mediaType === "multi") {
    const movieData = await tmdbFetch<TmdbPaginated<TmdbMovieSummary>>("/discover/movie", {
      params: { 
        page, 
        with_genres: genreId ? String(genreId) : undefined,
        with_keywords: keywords || undefined,
        sort_by: "popularity.desc",
        include_adult: false
      },
      revalidate: 0,
    });
    totalResults += movieData.total_results;
    totalPages = Math.max(totalPages, movieData.total_pages);
    for (const r of movieData.results) {
      const item = mapMovieSummary(r, movieGenres);
      movies.push(item);
      all.push(item);
    }
  }

  if (mediaType === "tv" || mediaType === "multi") {
    const tvData = await tmdbFetch<TmdbPaginated<TmdbTvSummary>>("/discover/tv", {
      params: { 
        page, 
        with_genres: genreId ? String(genreId) : undefined,
        with_keywords: keywords || undefined,
        sort_by: "popularity.desc",
        include_adult: false
      },
      revalidate: 0,
    });
    totalResults += tvData.total_results;
    totalPages = Math.max(totalPages, tvData.total_pages);
    for (const r of tvData.results) {
      const isAnime = r.origin_country?.includes("JP") && r.genre_ids?.includes(16);
      const item = mapTvSummary(r, tvGenres);
      if (isAnime) anime.push(item);
      else tv.push(item);
      all.push(item);
    }
  }

  all.sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0));
  return { movies, tv, anime, actors, all, totalResults, totalPages };
}