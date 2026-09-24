"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { computeDnaFromMediaIds } from "@/lib/dna/compute";
import type { DnaRow } from "@/types/dna";
import type { EntertainmentDna } from "@/types/dna";

export type DnaActionResult =
  | { ok: true; dna: EntertainmentDna }
  | { ok: false; error: "unauthenticated" | "unconfigured" | "not_found" | "failed" };

/**
 * Recompute and store the current user's Entertainment DNA based on their
 * watchlist contents. This is a full recompute — run after watchlist changes
 * or on a periodic schedule.
 */
export async function recomputeDna(): Promise<DnaActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  // 1. Fetch the user's watchlist rows (media_type + media_id).
  const { data: rows, error: fetchError } = await supabase
    .from("watchlist")
    .select("media_type, media_id")
    .eq("user_id", user.id);

  if (fetchError) return { ok: false, error: "failed" };

  // 2. Compute DNA from the watchlist.
  const result = await computeDnaFromMediaIds(
    (rows ?? []).map((r: { media_type: string; media_id: string }) => ({
      mediaType: r.media_type,
      mediaId: r.media_id,
    })),
  );

  // 3. Upsert into the entertainment_dna table.
  const dbRow: DnaRow = {
    genre_weights: result.genreWeights,
    top_actors: result.topActors,
    top_directors: result.topDirectors,
    top_studios: result.topStudios,
    preferred_languages: result.preferredLanguages,
    preferred_runtime_range: result.preferredRuntimeRange,
    mood_tags: result.moodTags,
    is_public: false,
    last_computed_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("entertainment_dna")
    .upsert(
      {
        user_id: user.id,
        ...dbRow,
      },
      { onConflict: "user_id" },
    );

  if (upsertError) return { ok: false, error: "failed" };

  revalidatePath("/dna");

  return {
    ok: true,
    dna: {
      userId: user.id,
      genreWeights: result.genreWeights,
      topActors: result.topActors,
      topDirectors: result.topDirectors,
      topStudios: result.topStudios,
      preferredLanguages: result.preferredLanguages,
      preferredRuntimeRange: result.preferredRuntimeRange,
      moodTags: result.moodTags,
      isPublic: false,
      lastComputedAt: dbRow.last_computed_at,
    },
  };
}

/**
 * Fetch the current user's stored Entertainment DNA.
 */
export async function getMyDna(): Promise<EntertainmentDna | null> {
  if (!isSupabaseConfigured()) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("entertainment_dna")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;

  const row = data as unknown as DnaRow & { user_id: string };

  return {
    userId: row.user_id,
    genreWeights: row.genre_weights ?? [],
    topActors: row.top_actors ?? [],
    topDirectors: row.top_directors ?? [],
    topStudios: row.top_studios ?? [],
    preferredLanguages: row.preferred_languages ?? [],
    preferredRuntimeRange: row.preferred_runtime_range ?? null,
    moodTags: row.mood_tags ?? [],
    isPublic: row.is_public,
    lastComputedAt: row.last_computed_at,
  };
}

/**
 * Toggle the public/private visibility of the user's DNA profile.
 */
export async function setDnaVisibility(
  isPublic: boolean,
): Promise<DnaActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("entertainment_dna")
    .upsert(
      {
        user_id: user.id,
        is_public: isPublic,
        last_computed_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) return { ok: false, error: "failed" };

  revalidatePath("/dna");

  return { ok: true, dna: await getMyDna() as EntertainmentDna };
}