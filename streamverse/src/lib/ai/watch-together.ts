import "server-only";

import { z } from "zod";
import { isAIConfigured } from "@/lib/env";
import { getAIProvider } from "@/lib/ai/provider";
import type { RankedSuggestion } from "@/types/watch-together";

const responseSchema = z.object({ results: z.array(z.object({ key: z.string(), reason: z.string().min(1).max(280) })).min(1) });

export function fallbackMediation(suggestions: RankedSuggestion[]) {
  return suggestions.slice(0, 3).map((item) => ({ key: item.key, reason: `${item.voteCount} ${item.voteCount === 1 ? "vote" : "votes"} from the room.` }));
}

/** Uses local AI only to explain an already vote-ranked shortlist; it never invents titles. */
export async function mediateWatchTogether(
  suggestions: RankedSuggestion[],
  personalization: string,
): Promise<Array<{ key: string; reason: string }>> {
  const shortlist = suggestions.slice(0, 8);
  if (!isAIConfigured() || shortlist.length === 0) return fallbackMediation(shortlist);
  const prompt = `You mediate a group movie night. Rank only these supplied titles. Respect vote counts first, then use this host personalization context only as a tie-breaker. Return JSON {"results":[{"key":"movie:1","reason":"short reason"}]}. Titles: ${JSON.stringify(shortlist.map(({ key, title, mediaType, voteCount, voteAverage }) => ({ key, title, mediaType, voteCount, voteAverage })))}. ${personalization}`;
  try {
    const provider = getAIProvider();
    const responseJson = await provider.generateJSON(prompt, undefined, 0.25);
    const parsed = responseSchema.safeParse(JSON.parse(responseJson));
    if (!parsed.success) return fallbackMediation(shortlist);
    const valid = new Set(shortlist.map((item) => item.key));
    const unique = parsed.data.results.filter((item, index, all) => valid.has(item.key) && all.findIndex((other) => other.key === item.key) === index);
    return unique.length > 0 ? unique : fallbackMediation(shortlist);
  } catch {
    return fallbackMediation(shortlist);
  }
}
