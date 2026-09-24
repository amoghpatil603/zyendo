import { z } from "zod";
import { getAIProvider } from "@/lib/ai/provider";

const intentSchema = z.object({
  isIntent: z.boolean(),
  genreId: z.number().nullable(),
  keywords: z.string().nullable(),
  mediaType: z.enum(["movie", "tv", "multi"]).nullable(),
});

export type SearchIntent = z.infer<typeof intentSchema>;

export async function parseSearchIntent(query: string): Promise<SearchIntent | null> {
  // If it's a very short query, probably a keyword search
  if (query.trim().split(/\s+/).length <= 2) {
    return null;
  }

  const systemInstruction = `You are a search query intent parser for a movie and TV tracking application. 
Analyze the user's search query to determine if they are searching for a specific title (e.g. "The Matrix", "Breaking Bad") or asking for recommendations based on intent (e.g. "I need adventure movies", "emotional anime", "Funny TV shows").

If it is a recommendation intent, return isIntent=true, along with the best matching TMDB genre ID (if applicable), keywords, and mediaType ("movie", "tv", or "multi").
For Anime, use genreId 16 and mediaType "tv".
If it is just a specific title search, return isIntent=false.

Return ONLY strict JSON matching this schema:
{
  "isIntent": boolean,
  "genreId": number | null,
  "keywords": string | null,
  "mediaType": "movie" | "tv" | "multi" | null
}`;

  try {
    const provider = getAIProvider();
    // Timeout of 3s to fallback fast
    const responsePromise = provider.generateJSON(`Query: "${query}"`, systemInstruction, 0.1);
    const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
    
    const responseJson = await Promise.race([responsePromise, timeoutPromise]);
    const parsed = intentSchema.safeParse(JSON.parse(responseJson));
    if (parsed.success && parsed.data.isIntent) {
      return parsed.data;
    }
    return null;
  } catch (error) {
    console.warn("Failed to parse search intent (falling back):", error);
    return null;
  }
}
