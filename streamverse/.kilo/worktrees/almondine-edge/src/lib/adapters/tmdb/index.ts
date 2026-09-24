import "server-only";

import { cache } from "react";

import type { MediaDetail, MediaItem } from "@/types/media-item";
import { tmdbFetch, tmdbImageUrl } from "./client";
import {
  mapMovieDetail,
  mapMovieSummary,
  mapTvDetail,
  mapTvSummary,
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

export async function listMovieGenres(): Promise<GenreOption[]> {
  const map = await getMovieGenres();
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

export async function listTvGenres(): Promise<GenreOption[]> {
  const map = await getTvGenres();
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

// --- Movies ----------------------------------------------------------------

async function movieList(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<MediaItem[]> {
  const [data, genres] = await Promise.all([
    tmdbFetch<TmdbPaginated<TmdbMovieSummary>>(path, {
      params: { language: DEFAULT_LANGUAGE, ...params },
    }),
    getMovieGenres(),
  ]);
  return data.results.map((m) => mapMovieSummary(m, genres));
}

export const getPopularMovies = (page = 1) =>
  movieList("/movie/popular", { page, region: DEFAULT_REGION });
export const getTopRatedMovies = (page = 1) =>
  movieList("/movie/top_rated", { page, region: DEFAULT_REGION });
export const getUpcomingMovies = (page = 1) =>
  movieList("/movie/upcoming", { page, region: DEFAULT_REGION });
export const getNowPlayingMovies = (page = 1) =>
  movieList("/movie/now_playing", { page, region: DEFAULT_REGION });

export const getTrendingMovies = (page = 1) =>
  movieList("/trending/movie/week", { page });

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

export async function getMovieDetail(id: string): Promise<MediaDetail> {
  const data = await tmdbFetch<TmdbMovieDetail>(`/movie/${id}`, {
    params: {
      language: DEFAULT_LANGUAGE,
      append_to_response: "credits,videos,watch/providers,similar,recommendations",
    },
  });
  return mapMovieDetail(data, DEFAULT_REGION);
}

// --- TV --------------------------------------------------------------------

async function tvList(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<MediaItem[]> {
  const [data, genres] = await Promise.all([
    tmdbFetch<TmdbPaginated<TmdbTvSummary>>(path, {
      params: { language: DEFAULT_LANGUAGE, ...params },
    }),
    getTvGenres(),
  ]);
  return data.results.map((t) => mapTvSummary(t, genres));
}

export const getPopularTv = (page = 1) => tvList("/tv/popular", { page });
export const getTopRatedTv = (page = 1) => tvList("/tv/top_rated", { page });
export const getAiringTodayTv = (page = 1) =>
  tvList("/tv/airing_today", { page });
export const getOnTheAirTv = (page = 1) => tvList("/tv/on_the_air", { page });
export const getTrendingTv = (page = 1) =>
  tvList("/trending/tv/week", { page });

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

export async function getTvDetail(id: string): Promise<MediaDetail> {
  const data = await tmdbFetch<TmdbTvDetail>(`/tv/${id}`, {
    params: {
      language: DEFAULT_LANGUAGE,
      append_to_response: "credits,videos,watch/providers,similar,recommendations",
    },
  });
  return mapTvDetail(data, DEFAULT_REGION);
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

export interface SearchResults {
  movies: MediaItem[];
  tv: MediaItem[];
  all: MediaItem[];
  totalResults: number;
}

/** Unified search across movies + TV (people filtered out for Phase 1). */
export async function searchMulti(
  query: string,
  page = 1,
): Promise<SearchResults> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { movies: [], tv: [], all: [], totalResults: 0 };
  }
  const [data, movieGenres, tvGenres] = await Promise.all([
    tmdbFetch<TmdbPaginated<TmdbMultiResult>>("/search/multi", {
      params: { query: trimmed, page, include_adult: false },
    }),
    getMovieGenres(),
    getTvGenres(),
  ]);

  const movies: MediaItem[] = [];
  const tv: MediaItem[] = [];
  for (const r of data.results) {
    if (r.media_type === "movie") movies.push(mapMovieSummary(r, movieGenres));
    else if (r.media_type === "tv") tv.push(mapTvSummary(r, tvGenres));
  }
  const all = [...movies, ...tv].sort(
    (a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0),
  );
  return { movies, tv, all, totalResults: data.total_results };
}
