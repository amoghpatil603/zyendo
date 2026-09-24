"use server";

import {
  getMoviesByGenre,
  getNowPlayingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getTrendingMovies,
  getUpcomingMovies,
  getTvByGenre,
  getAiringTodayTv,
  getOnTheAirTv,
  getPopularTv,
  getTopRatedTv,
  getTrendingTv,
  getAnimeTrending,
  getAnimePopular,
  getAnimeTopRated,
  getAnimeAiring,
  getAnimeUpcoming,
  getAnimeMovies,
} from "@/lib/adapters/tmdb";
import { safeList } from "@/lib/safe";
import type { MediaItem } from "@/types/media-item";

function fetchMoviesByCategory(category: string, page: number): Promise<MediaItem[]> {
  switch (category) {
    case "popular":
      return getPopularMovies(page);
    case "top_rated":
      return getTopRatedMovies(page);
    case "upcoming":
      return getUpcomingMovies(page);
    case "now_playing":
      return getNowPlayingMovies(page);
    case "trending":
    default:
      return getTrendingMovies(page);
  }
}

function fetchTvByCategory(category: string, page: number): Promise<MediaItem[]> {
  switch (category) {
    case "popular":
      return getPopularTv(page);
    case "top_rated":
      return getTopRatedTv(page);
    case "on_the_air":
      return getOnTheAirTv(page);
    case "airing_today":
      return getAiringTodayTv(page);
    case "trending":
    default:
      return getTrendingTv(page);
  }
}

function fetchAnimeByCategory(category: string, page: number): Promise<MediaItem[]> {
  switch (category) {
    case "popular":
      return getAnimePopular(page);
    case "top_rated":
      return getAnimeTopRated(page);
    case "airing":
      return getAnimeAiring(page);
    case "upcoming":
      return getAnimeUpcoming(page);
    case "movies":
      return getAnimeMovies(page);
    case "trending":
    default:
      return getAnimeTrending(page);
  }
}

export async function fetchMedia(
  mediaType: "movie" | "tv" | "anime",
  category: string,
  genreId: number | undefined,
  page: number,
): Promise<MediaItem[]> {
  if (genreId) {
    switch (mediaType) {
      case "movie":
        return safeList(() => getMoviesByGenre(genreId, page));
      case "tv":
        return safeList(() => getTvByGenre(genreId, page));
      case "anime":
        return safeList(() => getAnimeTrending(page));
    }
  }

  switch (mediaType) {
    case "movie":
      return safeList(() => fetchMoviesByCategory(category, page));
    case "tv":
      return safeList(() => fetchTvByCategory(category, page));
    case "anime":
      return safeList(() => fetchAnimeByCategory(category, page));
  }
}
