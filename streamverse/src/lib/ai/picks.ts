import "server-only";

import { z } from "zod";

import { getTrendingAll } from "@/lib/adapters/tmdb";
import { getMediaDetail } from "@/lib/adapters/registry";
import { getLocalPoolForRecommendations } from "@/lib/db-cache";
import { isTmdbConfigured } from "@/lib/env";
import { getAIProvider } from "@/lib/ai/provider";
import type { AiPick } from "@/types/ai-picks";
import type { MediaDetail } from "@/types/media-item";

const pickSchema = z.object({ type: z.enum(["movie", "tv"]), id: z.coerce.string().min(1), why: z.string().trim().min(1).max(300) });
const responseSchema = z.object({ recommendations: z.array(pickSchema).min(6).max(10) });
const singlePickSchema = z.object({ recommendations: z.array(pickSchema).min(1).max(3) });

const STATIC_FALLBACK_TITLES = [
  { type: "movie", id: "27205", title: "Inception", genres: ["Action", "Sci-Fi"], year: "2010", rating: 8.3 },
  { type: "movie", id: "157336", title: "Interstellar", genres: ["Adventure", "Drama", "Sci-Fi"], year: "2014", rating: 8.4 },
  { type: "movie", id: "155", title: "The Dark Knight", genres: ["Drama", "Action", "Crime"], year: "2008", rating: 8.5 },
  { type: "movie", id: "680", title: "Pulp Fiction", genres: ["Thriller", "Crime"], year: "1994", rating: 8.5 },
  { type: "movie", id: "13", title: "Forrest Gump", genres: ["Comedy", "Drama", "Romance"], year: "1994", rating: 8.5 },
  { type: "movie", id: "238", title: "The Godfather", genres: ["Drama", "Crime"], year: "1972", rating: 8.7 },
  { type: "movie", id: "278", title: "The Shawshank Redemption", genres: ["Drama", "Crime"], year: "1994", rating: 8.7 },
  { type: "movie", id: "550", title: "Fight Club", genres: ["Drama"], year: "1999", rating: 8.4 },
  { type: "movie", id: "120", title: "The Lord of the Rings: The Fellowship of the Ring", genres: ["Adventure", "Fantasy", "Action"], year: "2001", rating: 8.4 },
  { type: "movie", id: "121", title: "The Lord of the Rings: The Two Towers", genres: ["Adventure", "Fantasy", "Action"], year: "2002", rating: 8.4 },
  { type: "movie", id: "122", title: "The Lord of the Rings: The Return of the King", genres: ["Adventure", "Fantasy", "Action"], year: "2003", rating: 8.5 },
  { type: "tv", id: "1396", title: "Breaking Bad", genres: ["Drama", "Crime"], year: "2008", rating: 8.9 },
  { type: "tv", id: "1399", title: "Game of Thrones", genres: ["Action", "Adventure", "Drama", "Fantasy"], year: "2011", rating: 8.4 },
  { type: "tv", id: "60625", title: "Rick and Morty", genres: ["Animation", "Sci-Fi", "Comedy"], year: "2013", rating: 8.7 },
  { type: "tv", id: "46896", title: "The Blacklist", genres: ["Drama", "Crime", "Mystery"], year: "2013", rating: 7.6 },
  { type: "tv", id: "66732", title: "Stranger Things", genres: ["Drama", "Sci-Fi", "Mystery"], year: "2016", rating: 8.6 },
  { type: "tv", id: "70785", title: "Anne with an E", genres: ["Drama", "Family"], year: "2017", rating: 8.7 },
  { type: "tv", id: "82856", title: "The Mandalorian", genres: ["Sci-Fi", "Action", "Adventure"], year: "2019", rating: 8.4 },
  { type: "tv", id: "119051", title: "Wednesday", genres: ["Comedy", "Fantasy", "Mystery"], year: "2022", rating: 8.5 },
];

export function isAiPicksCacheFresh(expiresAt: string, now = Date.now()): boolean {
  return Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > now;
}

/** Generates a balanced, validated set of personal recommendations, falling back to static options if TMDB is unavailable. */
export async function generateAiPicks(personalContext: string): Promise<AiPick[]> {
  let titles: Array<{ type: string; id: string; title: string; genres: string[]; year?: string; rating?: number }> = [];
  let tmdbAvailable = isTmdbConfigured();

  if (tmdbAvailable) {
    try {
      const localPool = await getLocalPoolForRecommendations(60);
      if (localPool.length >= 10) {
        titles = localPool.map((item) => ({
          type: item.type,
          id: item.externalId,
          title: item.title,
          genres: item.genres,
          year: item.releaseDate?.slice(0, 4),
          rating: item.voteAverage,
          mood: item.aiMetadata?.mood,
          themes: item.aiMetadata?.themes,
        }));
      } else {
        const trending = await getTrendingAll();
        titles = trending.slice(0, 40).map((item) => ({
          type: item.type,
          id: item.externalId,
          title: item.title,
          genres: item.genres,
          year: item.releaseDate?.slice(0, 4),
          rating: item.voteAverage,
        }));
      }
    } catch (e) {
      console.warn("Failed to fetch trending titles from TMDB (using static fallbacks):", e);
      tmdbAvailable = false;
    }
  }

  if (!tmdbAvailable || titles.length === 0) {
    titles = STATIC_FALLBACK_TITLES;
  }

  const systemInstruction = `You generate personalized movie/TV recommendations. Return strict JSON only in this shape: {"recommendations":[{"type":"movie|tv","id":"TMDB id from the context","why":"one concise, personalized explanation"}]}. Use ONLY ids provided in the context.`;
  const prompt = `Create 6 to 10 distinct, high-confidence movie or TV recommendations for this user. User context: ${personalContext}. Context TMDB titles: ${JSON.stringify(titles)}`;

  const provider = getAIProvider();
  const responseJson = await provider.generateJSON(prompt, systemInstruction, 0.65);

  const parsed = responseSchema.safeParse(JSON.parse(responseJson));
  if (!parsed.success) throw new Error("AI returned invalid recommendations.");

  const allowed = new Set(titles.map((item) => `${item.type}:${item.id}`));
  const unique = [...new Map(parsed.data.recommendations.filter((pick) => allowed.has(`${pick.type}:${pick.id}`)).map((pick) => [`${pick.type}:${pick.id}`, pick])).values()];
  if (unique.length < 6) throw new Error("AI returned too few valid recommendations.");

  const details = await Promise.all(unique.map(async (pick) => {
    let media: MediaDetail | null = null;
    if (tmdbAvailable) {
      try {
        media = await getMediaDetail(pick.type, pick.id);
      } catch (e) {
        console.warn(`Failed to fetch TMDB details for ${pick.type}:${pick.id} (falling back to mock):`, e);
      }
    }
    
    if (!media) {
      const match = titles.find((t) => t.id === pick.id);
      media = {
        id: `${pick.type}:${pick.id}`,
        type: pick.type,
        externalId: pick.id,
        title: match?.title || "Recommended Title",
        coverImageUrl: null,
        backdropImageUrl: null,
        synopsis: pick.why,
        source: "tmdb",
        genres: match?.genres || [],
        people: [],
        runtimeMinutes: 120,
        releaseDate: match?.year ? `${match.year}-01-01` : "2025-01-01",
        voteAverage: match?.rating || 8.0,
        trailers: [],
        watchProviders: [],
        similar: [],
      };
    }
    return { pick, media };
  }));

  const recommendations = details.map(({ pick, media }) => ({ media, why: pick.why }));
  return recommendations;
}

/**
 * Produces a single personalized "AI Pick of the Day" using the same
 * personalization signals and machinery as `generateAiPicks`, but requests just
 * one focused recommendation. Returns null when AI is unavailable or generation
 * fails, so callers can gracefully omit the section.
 */
export async function generateDailyAiPick(personalContext: string): Promise<AiPick | null> {
  let titles: Array<{ type: string; id: string; title: string; genres: string[]; year?: string; rating?: number }> = [];
  let tmdbAvailable = isTmdbConfigured();

  if (tmdbAvailable) {
    try {
      const localPool = await getLocalPoolForRecommendations(60);
      if (localPool.length >= 10) {
        titles = localPool.map((item) => ({
          type: item.type,
          id: item.externalId,
          title: item.title,
          genres: item.genres,
          year: item.releaseDate?.slice(0, 4),
          rating: item.voteAverage,
          mood: item.aiMetadata?.mood,
          themes: item.aiMetadata?.themes,
        }));
      } else {
        const trending = await getTrendingAll();
        titles = trending.slice(0, 40).map((item) => ({
          type: item.type,
          id: item.externalId,
          title: item.title,
          genres: item.genres,
          year: item.releaseDate?.slice(0, 4),
          rating: item.voteAverage,
        }));
      }
    } catch (e) {
      console.warn("Failed to fetch trending titles from TMDB (using static fallbacks):", e);
      tmdbAvailable = false;
    }
  }

  if (!tmdbAvailable || titles.length === 0) {
    titles = STATIC_FALLBACK_TITLES;
  }

  const systemInstruction = `You generate ONE personalized movie/TV recommendation. Return strict JSON only in this shape: {"recommendations":[{"type":"movie|tv","id":"TMDB id from the context","why":"one concise, personalized explanation"}]}. Use ONLY ids provided in the context.`;
  const prompt = `Pick exactly ONE high-confidence title this specific user is most likely to enjoy right now. User context: ${personalContext}. Context TMDB titles: ${JSON.stringify(titles)}`;

  try {
    const provider = getAIProvider();
    const responseJson = await provider.generateJSON(prompt, systemInstruction, 0.6);
    const parsed = singlePickSchema.safeParse(JSON.parse(responseJson));
    if (!parsed.success) return null;

    const allowed = new Set(titles.map((item) => `${item.type}:${item.id}`));
    const first = parsed.data.recommendations.find((pick) => allowed.has(`${pick.type}:${pick.id}`));
    if (!first) return null;

    let media: MediaDetail | null = null;
    if (tmdbAvailable) {
      try {
        media = await getMediaDetail(first.type, first.id);
      } catch (e) {
        console.warn(`Failed to fetch TMDB details for ${first.type}:${first.id}:`, e);
      }
    }

    if (!media) {
      const match = titles.find((t) => t.id === first.id);
      media = {
        id: `${first.type}:${first.id}`,
        type: first.type,
        externalId: first.id,
        title: match?.title || "Recommended Title",
        coverImageUrl: null,
        backdropImageUrl: null,
        synopsis: first.why,
        source: "tmdb",
        genres: match?.genres || [],
        people: [],
        runtimeMinutes: 120,
        releaseDate: match?.year ? `${match.year}-01-01` : "2025-01-01",
        voteAverage: match?.rating || 8.0,
        trailers: [],
        watchProviders: [],
        similar: [],
      };
    }

    return { media, why: first.why };
  } catch (e) {
    console.warn("Failed to generate daily AI pick:", e);
    return null;
  }
}
