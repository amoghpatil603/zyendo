/**
 * The shared, source-agnostic media shape that every content vertical
 * (movies, TV, and future verticals like anime/music) normalizes into.
 *
 * UI components render against `MediaItem` and never against a provider's
 * raw response, so adding a new vertical means writing one new adapter
 * rather than touching shared UI or the recommendation/DNA/search layers.
 */

export type MediaType = "movie" | "tv" | "anime" | "music" | (string & {});

export type MediaSource =
  | "tmdb"
  | "jikan"
  | "anilist"
  | "jamendo"
  | (string & {});

export interface MediaPerson {
  name: string;
  role: string;
  imageUrl?: string;
  externalId?: string;
}

/** Normalized "summary" shape used for cards, rows and grids. */
export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  coverImageUrl: string | null;
  backdropImageUrl?: string | null;
  synopsis: string;
  source: MediaSource;
  externalId: string;
  genres: string[];
  people: MediaPerson[];
  runtimeMinutes?: number;
  releaseDate?: string;
  /** 0-10 average rating when the source provides one. */
  voteAverage?: number;
}

export interface WatchProvider {
  name: string;
  logoUrl?: string;
  /** How the title is available on this provider. */
  type: "stream" | "rent" | "buy" | "free";
}

export interface Trailer {
  key: string;
  site: "YouTube" | (string & {});
  name: string;
}

export interface SeasonSummary {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate?: string;
  posterUrl?: string | null;
  overview?: string;
}

/** Full detail shape rendered by the shared MediaDetailPage. */
export interface MediaDetail extends MediaItem {
  tagline?: string;
  status?: string;
  trailers: Trailer[];
  /** Outbound "where to watch" links, region-specific. Never embedded streams. */
  watchProviders: WatchProvider[];
  /** Link out to the official provider page (TMDB "watch" page / JustWatch). */
  watchLink?: string;
  similar: MediaItem[];
  /** Only present for TV. */
  seasons?: SeasonSummary[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  originalLanguage?: string;
  homepage?: string;
}
