/**
 * User Memory types.
 *
 * The `user_memory` table exists in supabase/migrations/0001_init.sql with
 * RLS policies in 0002_rls.sql (`user_memory_owner` — owner-only for all ops).
 *
 * Memory types:
 * - preference: things the user likes (e.g. "I love Christopher Nolan")
 * - exclusion: things the user dislikes (e.g. "I don't like horror")
 * - constraint: hard rules (e.g. "I prefer movies under 2 hours")
 * - context: situational info (e.g. "Recommend family-friendly movies")
 */

export const MEMORY_TYPES = [
  "preference",
  "exclusion",
  "constraint",
  "context",
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

/** Camel-case domain shape used by UI and business-logic layers. */
export interface UserMemory {
  id: string;
  userId: string;
  statement: string;
  type: MemoryType;
  active: boolean;
  createdAt: string;
}

/** Raw snake_case row returned by Supabase for `user_memory`. */
export interface UserMemoryRow {
  id: string;
  user_id: string;
  statement: string;
  type: MemoryType;
  active: boolean;
  created_at: string;
}

/** Human-readable labels for each memory type. */
export const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  preference: "Preferences",
  exclusion: "Exclusions",
  constraint: "Constraints",
  context: "Context",
};

/** Short descriptions shown in the UI for each memory type. */
export const MEMORY_TYPE_DESCRIPTIONS: Record<MemoryType, string> = {
  preference: "Things you like",
  exclusion: "Things you dislike",
  constraint: "Hard rules to follow",
  context: "Situational info",
};