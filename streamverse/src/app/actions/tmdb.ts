"use server";

import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getTrendingTv,
  getPopularTv,
  getTopRatedTv,
  getAnimeTrending,
  getAnimePopular,
  getAnimeTopRated,
  getAnimeAiring,
  getAnimeUpcoming,
  getAnimeMovies,
  getUpcomingMovies,
  getAiringTodayTv,
  getOnTheAirTv,
  getMoviesByGenre,
  getTvByGenre,
  getTrendingAll,
} from "@/lib/adapters/tmdb";
import type { MediaItem } from "@/types/media-item";

/**
 * Fetch media items by category. Used by infinite scroll components.
 * Category strings: trending_movies, popular_movies, top_rated_movies, upcoming_movies, now_playing,
 *                   trending_tv, popular_tv, top_rated_tv, airing_today, on_the_air,
 *                   trending_anime, popular_anime, top_rated_anime, airing_anime, upcoming_anime, movies_anime,
 *                   trending_all, new_releases, upcoming_all
 *                   movies_by_genre, tv_by_genre (special cases for genre browsing)
 */
export async function fetchMediaByCategory(
  category: string,
  page: number,
  genreId?: number,
): Promise<MediaItem[]> {
  // Handle standard category fetching
  switch (category) {
    // Movies
    case "trending_movies":
      return getTrendingMovies(page, genreId);
    case "popular_movies":
      return getPopularMovies(page, genreId);
    case "top_rated_movies":
      return getTopRatedMovies(page, genreId);
    case "upcoming_movies":
      return getUpcomingMovies(page, genreId);
    case "now_playing":
      return getNowPlayingMovies(page, genreId);
    case "movies_by_genre":
      return getMoviesByGenre(genreId || 0, page);

    // TV
    case "trending_tv":
      return getTrendingTv(page, genreId);
    case "popular_tv":
      return getPopularTv(page, genreId);
    case "top_rated_tv":
      return getTopRatedTv(page, genreId);
    case "airing_today":
      return getAiringTodayTv(page, genreId);
    case "on_the_air":
      return getOnTheAirTv(page, genreId);
    case "tv_by_genre":
      return getTvByGenre(genreId || 0, page);

    // Anime
    case "trending_anime":
      return getAnimeTrending(page);
    case "popular_anime":
      return getAnimePopular(page);
    case "top_rated_anime":
      return getAnimeTopRated(page);
    case "airing_anime":
      return getAnimeAiring(page);
    case "upcoming_anime":
      return getAnimeUpcoming(page);
    case "movies_anime":
      return getAnimeMovies(page);

    // Mixed content
    case "trending_all":
      return getTrendingAll(page);

    // Combined sections
    case "new_releases": {
      const [movies, tv] = await Promise.all([
        getNowPlayingMovies(page, genreId),
        getAiringTodayTv(page, genreId),
      ]);
      return [...movies, ...tv];
    }
    case "upcoming_all": {
      const [movies, tv] = await Promise.all([
        getUpcomingMovies(page, genreId),
        getOnTheAirTv(page, genreId),
      ]);
      return [...movies, ...tv];
    }
    default:
      return getTrendingAll(page);
  }
}