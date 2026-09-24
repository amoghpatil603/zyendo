"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recomputeDna } from "@/app/actions/dna";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { RecommendationReaction, RecommendationSource } from "@/types/recommendation-feedback";

const feedbackSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
  mediaId: z.string().trim().min(1).max(32),
  source: z.enum(["ai_picks", "assistant", "watch_together"]),
  reaction: z.enum(["love", "like", "dislike"]),
});

export type RecommendationFeedbackResult =
  | { ok: true; reaction: RecommendationReaction }
  | { ok: false; error: "unauthenticated" | "unconfigured" | "failed" };

/** Stores or replaces the authenticated user's reaction to one recommendation. */
export async function setRecommendationFeedback(
  mediaType: string,
  mediaId: string,
  source: RecommendationSource,
  reaction: RecommendationReaction,
): Promise<RecommendationFeedbackResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };
  const parsed = feedbackSchema.safeParse({ mediaType, mediaId, source, reaction });
  if (!parsed.success) return { ok: false, error: "failed" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("recommendation_feedback").upsert({
    user_id: user.id,
    media_type: parsed.data.mediaType,
    media_id: parsed.data.mediaId,
    source: parsed.data.source,
    reaction: parsed.data.reaction,
    created_at: new Date().toISOString(),
  }, { onConflict: "user_id,media_type,media_id,source" });
  if (error) return { ok: false, error: "failed" };

  await recomputeDna().catch(() => undefined);
  revalidatePath("/picks");
  return { ok: true, reaction: parsed.data.reaction };
}
