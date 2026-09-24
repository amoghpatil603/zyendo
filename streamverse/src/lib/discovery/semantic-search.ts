import "server-only";

import { z } from "zod";

import { isTmdbConfigured, isAIConfigured } from "@/lib/env";
import { getAIProvider } from "@/lib/ai/provider";
import { searchMulti } from "@/lib/adapters/tmdb";
import {
  getMoviesByGenre,
  getTvByGenre,
  getAnimeTrending,
} from "@/lib/adapters/tmdb";
import { safeList } from "@/lib/safe";
import { getLocalPoolForRecommendations } from "@/lib/db-cache";
import type { MediaItem } from "@/types/media-item";

/**
 * Semantic ("smart") search for the Discover page.
 *
 * Flow:
 *   natural-language query
 *     -> AI intent extraction (structured preferences)
 *     -> TMDB discovery / search with those preferences
 *     -> ranked results
 *
 * If AI extraction fails (no key, network error, malformed JSON) we fall back
 * to a plain TMDB keyword search so the feature always returns something.
 */

export interface SemanticPreferences {
  mediaType: "movie" | "tv" | "any";
  genres: string[];
  mood: string[];
  themes: string[];
  keywords: string[];
  language?: string;
  yearMin?: number;
  yearMax?: number;
  minRating?: number;
}

const preferencesSchema = z.object({
  mediaType: z.enum(["movie", "tv", "any"]).default("any"),
  genres: z.array(z.string()).default([]),
  mood: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  language: z.string().optional(),
  yearMin: z.number().int().optional(),
  yearMax: z.number().int().optional(),
  minRating: z.number().optional(),
});

/** Maps common genre / mood words to TMDB genre ids. */
const GENRE_NAME_TO_ID: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  "anime": 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "sci-fi": 878,
  "science fiction": 878,
  thriller: 53,
  war: 10752,
  western: 37,
  "action & adventure": 12,
  "family film": 10751,
  "romantic comedy": 10749,
  "sci fi": 878,
  "film noir": 80,
  "tv movie": 10770,
};

const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: "en",
  japanese: "ja",
  korean: "ko",
  french: "fr",
  spanish: "es",
  german: "de",
  hindi: "hi",
  chinese: "zh",
  italian: "it",
  russian: "ru",
};

function normalizeGenreToken(token: string): number | null {
  const key = token.trim().toLowerCase();
  if (GENRE_NAME_TO_ID[key] !== undefined) return GENRE_NAME_TO_ID[key];
  // Try partial matches (e.g. "scifi" -> "sci-fi").
  for (const [name, id] of Object.entries(GENRE_NAME_TO_ID)) {
    if (name.includes(key) || key.includes(name)) return id;
  }
  return null;
}

function normalizeLanguage(token?: string): string | undefined {
  if (!token) return undefined;
  const key = token.trim().toLowerCase();
  if (LANGUAGE_NAME_TO_CODE[key]) return LANGUAGE_NAME_TO_CODE[key];
  // Accept raw 2-letter codes.
  if (/^[a-z]{2}$/.test(key)) return key;
  return undefined;
}

/**
 * Extracts structured preferences from a free-text query using the configured
 * AI provider. Returns null when AI is unavailable or produces invalid output.
 */
export async function extractSemanticPreferences(
  query: string,
): Promise<SemanticPreferences | null> {
  if (!isAIConfigured() || !isTmdbConfigured()) return null;

  const systemInstruction = `You are a movie/TV recommendation query parser. Convert the user's natural-language request into structured search preferences. Respond with STRICT JSON only: {"mediaType":"movie|tv|any","genres":[string],"mood":[string],"themes":[string],"keywords":[string],"language":string|null,"yearMin":number|null,"yearMax":number|null,"minRating":number|null}. Use TMDB-style genre names (Action, Comedy, Drama, Horror, Sci-Fi, Thriller, Romance, Documentary, Animation, Fantasy, Mystery, Crime, Family, War, Western, History, Music). Keep it concise.`;

  try {
    const provider = getAIProvider();
    const json = await provider.generateJSON(
      `Parse this request into preferences: "${query}"`,
      systemInstruction,
      0.2,
    );
    const parsed = preferencesSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    return parsed.data;
  } catch (err) {
    console.warn("[semantic-search] AI intent extraction failed; falling back:", err);
    return null;
  }
}

function rankByPreferences(items: MediaItem[], prefs: SemanticPreferences): MediaItem[] {
  if (!prefs.genres.length && !prefs.keywords.length && !prefs.mood.length) return items;

  const desiredGenres = new Set(prefs.genres.map((g) => g.toLowerCase()));
  const desiredKeywords = new Set(
    [...prefs.keywords, ...prefs.mood, ...prefs.themes].map((k) => k.toLowerCase()),
  );

  const score = (item: MediaItem): number => {
    let s = 0;
    for (const g of item.genres) {
      if (desiredGenres.has(g.toLowerCase())) s += 3;
    }
    const haystack = `${item.title} ${item.synopsis}`.toLowerCase();
    for (const kw of desiredKeywords) {
      if (kw && haystack.includes(kw)) s += 1;
    }
    return s;
  };

  return [...items]
    .map((item) => ({ item, score: score(item) }))
    .sort((a, b) => b.score - a.score || (b.item.voteAverage ?? 0) - (a.item.voteAverage ?? 0))
    .map((x) => x.item);
}

export interface SemanticSearchResult {
  /** True when AI intent extraction produced structured preferences. */
  semantic: boolean;
  query: string;
  items: MediaItem[];
}

async function keywordFallback(query: string): Promise<MediaItem[]> {
  const res = await searchMulti(query, 1);
  return res.all;
}

/**
 * Runs a smart search. When AI extraction is available it maps the extracted
 * preferences onto TMDB discovery endpoints and ranks the merged results;
 * otherwise it gracefully falls back to a keyword search.
 */
export async function semanticSearch(
  query: string,
  options?: { page?: number },
): Promise<SemanticSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) return { semantic: false, query: trimmed, items: [] };
  if (!isTmdbConfigured()) return { semantic: false, query: trimmed, items: [] };

  const prefs = await extractSemanticPreferences(trimmed);

  // Graceful fallback: no AI or extraction failed.
  if (!prefs) {
    const items = await safeList(() => keywordFallback(trimmed));
    return { semantic: false, query: trimmed, items };
  }

  try {
    const genreIds = [
      ...new Set(
        [...prefs.genres, ...prefs.mood, ...prefs.themes]
          .map(normalizeGenreToken)
          .filter((id): id is number => id !== null),
      ),
    ];
    const language = normalizeLanguage(prefs.language);
    const primaryGenre = genreIds[0];

    const tasks: Promise<MediaItem[]>[] = [];

    // Build discovery calls from the extracted preferences.
    // 1. Always check the local self-growing database first.
    tasks.push(
      getLocalPoolForRecommendations(200).then(items => {
        return items.map(i => ({
          ...i,
          id: i.externalId // Normalise ID for semantic search ranking
        })) as MediaItem[];
      }).catch(() => [])
    );

    // 2. TMDB API as a fallback if local DB has little data
    if (primaryGenre !== undefined) {
      if (prefs.mediaType === "tv") {
        tasks.push(safeList(() => getTvByGenre(primaryGenre, 1)));
      } else if (prefs.mediaType === "movie") {
        tasks.push(safeList(() => getMoviesByGenre(primaryGenre, 1)));
      } else {
        tasks.push(safeList(() => getMoviesByGenre(primaryGenre, 1)));
        tasks.push(safeList(() => getTvByGenre(primaryGenre, 1)));
      }
    } else if (prefs.mediaType === "tv") {
      tasks.push(safeList(() => getTvByGenre(10765, 1))); // 10765 = Sci-Fi & Fantasy as a neutral TV default
    } else if (prefs.mediaType === "movie") {
      tasks.push(safeList(() => getMoviesByGenre(18, 1))); // 18 = Drama as a neutral movie default
    } else {
      tasks.push(safeList(() => keywordFallback(trimmed)));
    }

    // Always pull keyword-based results so titles mentioned explicitly are included.
    tasks.push(safeList(() => keywordFallback(trimmed)));

    if (prefs.mediaType === "any" && prefs.genres.length === 0) {
      tasks.push(safeList(() => getAnimeTrending(1)));
    }

    const lists = await Promise.all(tasks);
    const merged = lists.flat();

    // De-duplicate by type + TMDB id.
    const seen = new Set<string>();
    const unique = merged.filter((item) => {
      const key = `${item.type}:${item.externalId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const ranked = rankByPreferences(unique, prefs);

    // Apply hard filters the AI can't express via discover endpoints.
    const filtered = ranked.filter((item) => {
      if (prefs.minRating !== undefined && (item.voteAverage ?? 0) < prefs.minRating) return false;
      if (prefs.yearMin !== undefined && item.releaseDate && Number(item.releaseDate.slice(0, 4)) < prefs.yearMin) return false;
      if (prefs.yearMax !== undefined && item.releaseDate && Number(item.releaseDate.slice(0, 4)) > prefs.yearMax) return false;
      if (language && item.type === "movie" && language === "ja") {
        // Anime preference: surface Japanese animation; keep others too but deprioritized.
      }
      return true;
    });

    return {
      semantic: true,
      query: trimmed,
      items: filtered.slice(0, 30),
    };
  } catch (err) {
    console.warn("[semantic-search] discovery failed; falling back to keyword:", err);
    const items = await safeList(() => keywordFallback(trimmed));
    return { semantic: false, query: trimmed, items };
  }
}
