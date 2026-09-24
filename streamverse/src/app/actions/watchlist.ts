"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { recomputeDna } from "@/app/actions/dna";

export type WatchlistActionResult =
  | { ok: true; added: boolean }
  | { ok: false; error: "unauthenticated" | "unconfigured" | "failed" };

const ALLOWED_TYPES = new Set(["movie", "tv", "anime"]);

/** Add the item if absent, remove it if present. Requires an authenticated user. */
export async function toggleWatchlist(
  mediaType: string,
  mediaId: string,
): Promise<WatchlistActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };
  if (!ALLOWED_TYPES.has(mediaType) || !mediaId) {
    return { ok: false, error: "failed" };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: selectError } = await supabase
    .from("watchlist")
    .select("id")
    .eq("user_id", user.id)
    .eq("media_type", mediaType)
    .eq("media_id", mediaId)
    .maybeSingle();

  if (selectError) return { ok: false, error: "failed" };

  if (existing) {
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, error: "failed" };
    revalidatePath("/watchlist");
    // Recompute DNA after removal
    await recomputeDna().catch(() => {});
    return { ok: true, added: false };
  }

  const { error } = await supabase.from("watchlist").insert({
    user_id: user.id,
    media_type: mediaType,
    media_id: mediaId,
  });
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/watchlist");
  // Recompute DNA after addition
  await recomputeDna().catch(() => {});
  return { ok: true, added: true };
}
