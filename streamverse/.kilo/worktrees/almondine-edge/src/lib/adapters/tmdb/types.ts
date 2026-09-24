/** Minimal typings for the subset of TMDB responses this app consumes. */

export interface TmdbPaginated<T> {
  page: number;
  total_pages: number;
  total_results: number;
  results: T[];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovieSummary {
  id: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids?: number[];
  release_date?: string;
  vote_average?: number;
  original_language?: string;
  media_type?: "movie";
}

export interface TmdbTvSummary {
  id: number;
  name: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids?: number[];
  first_air_date?: string;
  vote_average?: number;
  original_language?: string;
  media_type?: "tv";
}

export interface TmdbPersonSummary {
  id: number;
  name: string;
  profile_path: string | null;
  media_type: "person";
  known_for_department?: string;
}

export type TmdbMultiResult =
  | (TmdbMovieSummary & { media_type: "movie" })
  | (TmdbTvSummary & { media_type: "tv" })
  | TmdbPersonSummary;

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job?: string;
  department?: string;
  profile_path: string | null;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  name: string;
  official: boolean;
}

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export interface TmdbWatchProviderRegion {
  link?: string;
  flatrate?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
}

export interface TmdbMovieDetail extends TmdbMovieSummary {
  genres: TmdbGenre[];
  runtime: number | null;
  tagline?: string;
  status?: string;
  homepage?: string | null;
  credits?: TmdbCredits;
  videos?: { results: TmdbVideo[] };
  "watch/providers"?: { results: Record<string, TmdbWatchProviderRegion> };
  similar?: TmdbPaginated<TmdbMovieSummary>;
  recommendations?: TmdbPaginated<TmdbMovieSummary>;
}

export interface TmdbSeasonSummary {
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  overview?: string;
}

export interface TmdbTvDetail extends TmdbTvSummary {
  genres: TmdbGenre[];
  episode_run_time?: number[];
  tagline?: string;
  status?: string;
  homepage?: string | null;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: TmdbSeasonSummary[];
  credits?: TmdbCredits;
  videos?: { results: TmdbVideo[] };
  "watch/providers"?: { results: Record<string, TmdbWatchProviderRegion> };
  similar?: TmdbPaginated<TmdbTvSummary>;
  recommendations?: TmdbPaginated<TmdbTvSummary>;
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime?: number | null;
  vote_average?: number;
}

export interface TmdbSeasonDetail {
  season_number: number;
  name: string;
  overview?: string;
  poster_path: string | null;
  air_date?: string | null;
  episodes: TmdbEpisode[];
}
