/**
 * Type definitions for the Entertainment DNA system.
 *
 * DNA is a computed taste profile derived from a user's watchlist,
 * viewing history, and explicit feedback. It powers AI Picks and the
 * AI Assistant by providing structured context about what the user likes.
 *
 * The shape mirrors the `entertainment_dna` table in Supabase
 * (see supabase/migrations/0001_init.sql).
 */

/** A genre with its relative weight (0–1) in the user's taste profile. */
export interface GenreWeight {
  name: string;
  weight: number;
  /** Number of titles in this genre the user has engaged with. */
  count: number;
}

/** An actor or director the user tends to watch. */
export interface DnaPerson {
  externalId: string;
  name: string;
  imageUrl?: string;
  role: "actor" | "director";
  /** Number of titles featuring this person. */
  count: number;
}

export interface DnaStudio {
  name: string;
  count: number;
}

export interface DnaMoodTag {
  tag: string;
  /** 0–1 how strongly this mood applies. */
  weight: number;
}

/**
 * Full DNA profile stored per user.
 */
export interface EntertainmentDna {
  userId: string;
  genreWeights: GenreWeight[];
  topActors: DnaPerson[];
  topDirectors: DnaPerson[];
  topStudios: DnaStudio[];
  preferredLanguages: string[];
  /** Inclusive runtime range [min, max] in minutes. */
  preferredRuntimeRange: [number, number] | null;
  moodTags: DnaMoodTag[];
  releaseDecades?: string[];
  timeOfDayHabits?: string[];
  isPublic: boolean;
  lastComputedAt: string;
}

/**
 * Raw JSONB shape stored in the `entertainment_dna` table.
 * Maps 1:1 with the column names in the DB.
 */
export interface DnaRow {
  genre_weights: GenreWeight[] | null;
  top_actors: DnaPerson[] | null;
  top_directors: DnaPerson[] | null;
  top_studios: DnaStudio[] | null;
  preferred_languages: string[] | null;
  /** Stored as jsonb {min, max} in the DB (int4range is not serializable from JS). */
  preferred_runtime_range: { min: number; max: number } | null;
  /** Stored as text[] in the DB — flattened to just tag names (weights are recomputed). */
  mood_tags: string[] | null;
  is_public: boolean;
  last_computed_at: string;
}