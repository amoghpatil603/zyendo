"use server";

import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getTrendingTv,
  getPopularTv,
  getTopRatedTv,
  getAiringTodayTv,
  getOnTheAirTv,
  getAnimeTrending,
} from "@/lib/adapters/tmdb";
import type { MediaItem } from "@/types/media-item";

// --- Individual loaders kept for backward compatibility ---

export async function loadMoreTrendingMovies(page: number): Promise<MediaItem[]> {
  return getTrendingMovies(page);
}

export async function loadMorePopularMovies(page: number): Promise<MediaItem[]> {
  return getPopularMovies(page);
}

export async function loadMoreTopRatedMovies(page: number): Promise<MediaItem[]> {
  return getTopRatedMovies(page);
}

export async function loadMoreNewReleasesMovies(page: number): Promise<MediaItem[]> {
  return getNowPlayingMovies(page);
}

export async function loadMoreUpcomingMovies(page: number): Promise<MediaItem[]> {
  return getUpcomingMovies(page);
}

export async function loadMoreTrendingTv(page: number): Promise<MediaItem[]> {
  return getTrendingTv(page);
}

export async function loadMorePopularTv(page: number): Promise<MediaItem[]> {
  return getPopularTv(page);
}

export async function loadMoreTopRatedTv(page: number): Promise<MediaItem[]> {
  return getTopRatedTv(page);
}

export async function loadMoreAiringTodayTv(page: number): Promise<MediaItem[]> {
  return getAiringTodayTv(page);
}

export async function loadMoreOnTheAirTv(page: number): Promise<MediaItem[]> {
  return getOnTheAirTv(page);
}

export async function loadMoreAnime(page: number): Promise<MediaItem[]> {
  return getAnimeTrending(page);
}