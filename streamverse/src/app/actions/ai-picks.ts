"use server";


import { getPersonalizationContext } from "@/lib/ai/personal-context";
import { generateAiPicks, isAiPicksCacheFresh } from "@/lib/ai/picks";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isAIConfigured, isSupabaseConfigured } from "@/lib/env";
import type { AiPick, AiPicksCacheRow } from "@/types/ai-picks";
import type { RecommendationFeedbackRow } from "@/types/recommendation-feedback";

export type AiPicksResult =
  | { ok: true; recommendations: AiPick[]; generatedAt: string; cached: boolean }
  | { ok: false; error: "unauthenticated" | "unconfigured" | "failed" };

async function attachFeedback(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  recommendations: AiPick[],
): Promise<AiPick[]> {
  try {
    const { data, error } = await supabase.from("recommendation_feedback")
      .select("media_type, media_id, reaction, source, user_id, created_at")
      .eq("user_id", userId)
      .eq("source", "ai_picks");
    if (error) return recommendations;
    const reactions = new Map((data as RecommendationFeedbackRow[] ?? []).map((item) => [`${item.media_type}:${item.media_id}`, item.reaction]));
    return recommendations.map((pick) => ({ ...pick, reaction: reactions.get(`${pick.media.type}:${pick.media.externalId}`) }));
  } catch {
    return recommendations;
  }
}

export async function getAiPicks(forceRefresh = false): Promise<AiPicksResult> {
  if (!isSupabaseConfigured() || !isAIConfigured()) return { ok: false, error: "unconfigured" };
  if (typeof forceRefresh !== "boolean") return { ok: false, error: "failed" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  const supabase = await createSupabaseServerClient();
  
  if (!forceRefresh) {
    try {
      const { data, error } = await supabase.from("ai_picks_cache").select("*").eq("user_id", user.id).maybeSingle();
      if (error) {
        console.warn("AI Picks cache read failed (proceeding to generate recommendations):", error.message);
      } else {
        const cached = data as AiPicksCacheRow | null;
        if (cached && Array.isArray(cached.recommendations) && isAiPicksCacheFresh(cached.expires_at) && cached.recommendations.length >= 6) {
          return { ok: true, recommendations: await attachFeedback(supabase, user.id, cached.recommendations), generatedAt: cached.generated_at, cached: true };
        }
      }
    } catch (e: unknown) {
      console.warn("AI Picks cache read threw an exception (proceeding to generate recommendations):", e instanceof Error ? e.message : e);
    }
  }

  try {
    const generatedAt = new Date().toISOString();
    const recommendations = await generateAiPicks(await getPersonalizationContext(user.id));
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    try {
      const { error } = await supabase.from("ai_picks_cache").upsert({ user_id: user.id, recommendations, generated_at: generatedAt, expires_at: expiresAt }, { onConflict: "user_id" });
      if (error) {
        console.warn("AI Picks cache write failed (recommendations generated successfully but not cached):", error.message);
      }
    } catch (e: unknown) {
      console.warn("AI Picks cache write threw an exception (recommendations generated successfully but not cached):", e instanceof Error ? e.message : e);
    }

    return { ok: true, recommendations: await attachFeedback(supabase, user.id, recommendations), generatedAt, cached: false };
  } catch (e) {
    console.error("Failed to generate AI picks:", e);
    return { ok: false, error: "failed" };
  }
}
