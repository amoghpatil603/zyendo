import "server-only";

import { z } from "zod";
import { getAIProvider } from "@/lib/ai/provider";
import { isAIConfigured } from "@/lib/env";
import { setAiMetadata } from "@/lib/db-cache";
import type { MediaDetail } from "@/types/media-item";

const metadataSchema = z.object({
  mood: z.array(z.string()).max(5),
  themes: z.array(z.string()).max(5),
  pacing: z.string(),
  emotionalTone: z.string(),
  complexity: z.string(),
  targetDemographic: z.string(),
});

export type AiMetadata = z.infer<typeof metadataSchema>;

/**
 * Generates AI metadata for a media item if it doesn't already have it.
 * This should typically be fired asynchronously so as not to block UI rendering.
 */
export async function getOrGenerateAiMetadata(media: MediaDetail): Promise<AiMetadata | null> {
  if (media.aiMetadata) return media.aiMetadata as AiMetadata;
  
  if (!isAIConfigured() || !media.synopsis || media.synopsis.length < 10) return null;
  
  try {
    const provider = getAIProvider();
    const systemInstruction = `You are an expert film and television analyst. Output strict JSON matching the schema. Do not include markdown formatting or extra text.`;
    const prompt = `Analyze this title: "${media.title}". Genres: ${media.genres.join(", ")}. Synopsis: "${media.synopsis}".
Return a JSON object exactly with:
{
  "mood": ["array", "of", "up to 5", "moods"],
  "themes": ["array", "of", "up to 5", "core themes"],
  "pacing": "Slow, Moderate, Fast, or Frenetic",
  "emotionalTone": "e.g. Lighthearted, Dark, Melancholy, Uplifting, Tense",
  "complexity": "Simple, Moderate, Complex, Mind-bending",
  "targetDemographic": "Kids, Teens, Adults, or General Audience"
}`;

    const responseJson = await provider.generateJSON(prompt, systemInstruction, 0.4);
    
    // Attempt to parse json. Groq sometimes wraps in markdown.
    let cleanJson = responseJson.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    }
    
    const parsed = metadataSchema.safeParse(JSON.parse(cleanJson));
    
    if (parsed.success) {
      await setAiMetadata(media.id, parsed.data);
      media.aiMetadata = parsed.data;
      return parsed.data;
    }
  } catch (error) {
    console.error(`[AI Analysis] Failed to generate metadata for ${media.id}:`, error);
  }
  return null;
}
