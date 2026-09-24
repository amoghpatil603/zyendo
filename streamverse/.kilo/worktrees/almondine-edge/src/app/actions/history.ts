"use server";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type HistoryActionResult =
  | { ok: true }
  | { ok: false; error: "unauthenticated" | "unconfigured" | "failed" };

/**
 * Record a media view in the user's history table.
 * Called when a user visits a detail page. Idempotent — duplicate views
 * are appended (each visit gets its own row).
 */
export async function recordView(
  mediaType: string,
  mediaId: string,
): Promise<HistoryActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("history").insert({
    user_id: user.id,
    media_type: mediaType,
    media_id: mediaId,
  });

  if (error) return { ok: false, error: "failed" };

  return { ok: true };
}