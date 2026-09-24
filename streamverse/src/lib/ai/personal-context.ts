import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

interface PersonalDnaContext {
  genre_weights?: unknown;
  mood_tags?: unknown;
  preferred_runtime_range?: unknown;
}

interface PersonalMemoryContext {
  statement: string;
  type: string;
}

/** Formats only the active, user-owned signals that the AI may use for personalization. */
export function formatPersonalizationContext(
  dna: PersonalDnaContext | null,
  memories: PersonalMemoryContext[],
): string {
  return `Personal context (private, use only to personalize): DNA=${JSON.stringify(dna ?? {})}; memories=${JSON.stringify(memories)}.`;
}

/** Builds the minimal private profile context used by AI features. */
export async function getPersonalizationContext(userId: string): Promise<string> {
  if (!isSupabaseConfigured()) return "No saved profile is available.";
  const supabase = await createSupabaseServerClient();
  const [{ data: dna }, { data: memories }, { data: feedback }] = await Promise.all([
    supabase.from("entertainment_dna").select("genre_weights, mood_tags, preferred_runtime_range").eq("user_id", userId).maybeSingle(),
    supabase.from("user_memory").select("statement, type").eq("user_id", userId).eq("active", true).limit(20),
    supabase.from("recommendation_feedback").select("media_type, media_id, reaction").eq("user_id", userId).limit(30),
  ]);
  return `${formatPersonalizationContext(
    dna as PersonalDnaContext | null,
    (memories ?? []) as PersonalMemoryContext[],
  )} Recommendation feedback=${JSON.stringify(feedback ?? [])}.`;
}
