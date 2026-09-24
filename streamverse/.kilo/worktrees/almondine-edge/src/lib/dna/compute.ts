import "server-only";

import type { MediaItem } from "@/types/media-item";
import type {
  DnaPerson,
  DnaStudio,
  DnaMoodTag,
  GenreWeight,
} from "@/types/dna";
import { getMediaDetail } from "@/lib/adapters/registry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampWeight(n: number): number {
  return Math.min(1, Math.max(0, n));
}

// ---------------------------------------------------------------------------
// Genre weights
// ---------------------------------------------------------------------------

function computeGenreWeights(items: MediaItem[]): GenreWeight[] {
  const map = new Map<string, number>();

  for (const item of items) {
    for (const genre of item.genres) {
      map.set(genre, (map.get(genre) ?? 0) + 1);
    }
  }

  const entries = [...map.entries()];
  const maxCount = Math.max(1, ...entries.map(([, c]) => c));

  return entries
    .map(([name, count]) => ({
      name,
      weight: clampWeight(count / maxCount),
      count,
    }))
    .sort((a, b) => b.weight - a.weight);
}

// ---------------------------------------------------------------------------
// People (actors / directors)
// ---------------------------------------------------------------------------

function computeTopPeople(
  items: MediaItem[],
  role: "actor" | "director",
): DnaPerson[] {
  const map = new Map<string, { name: string; imageUrl?: string; count: number }>();

  for (const item of items) {
    for (const person of item.people) {
      const isActor = person.role.startsWith("as ");
      const isDirector = person.role === "Director";
      if (role === "actor" && !isActor) continue;
      if (role === "director" && !isDirector) continue;

      const externalId =
        person.externalId ?? person.name.toLowerCase().replace(/\s+/g, "-");
      const existing = map.get(externalId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(externalId, {
          name: person.name,
          imageUrl: person.imageUrl,
          count: 1,
        });
      }
    }
  }

  return [...map.entries()]
    .map(([externalId, data]) => ({
      externalId,
      name: data.name,
      imageUrl: data.imageUrl,
      role,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

function computePreferredLanguages(items: MediaItem[]): string[] {
  const detected: string[] = [];

  for (const item of items) {
    // MediaItem doesn't carry language, but MediaDetail does.
    // We fall back to the summary-level data for batch processing.
    // The full resolution happens when we hydrate via getMediaDetail.
    if ("originalLanguage" in item && item.originalLanguage) {
      detected.push(item.originalLanguage as string);
    }
  }

  const freq = new Map<string, number>();
  for (const lang of detected) {
    freq.set(lang, (freq.get(lang) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);
}

// ---------------------------------------------------------------------------
// Runtime range
// ---------------------------------------------------------------------------

function computeRuntimeRange(
  items: MediaItem[],
): [number, number] | null {
  const runtimes = items
    .map((i) => i.runtimeMinutes)
    .filter((r): r is number => typeof r === "number" && r > 0);

  if (runtimes.length === 0) return null;

  runtimes.sort((a, b) => a - b);
  // Use 25th and 75th percentile to ignore outliers.
  const idx25 = Math.floor(runtimes.length * 0.25);
  const idx75 = Math.floor(runtimes.length * 0.75);
  return [runtimes[idx25], runtimes[idx75]];
}

// ---------------------------------------------------------------------------
// Mood tags (derived from genre + runtime overlap)
// ---------------------------------------------------------------------------

const MOOD_MAP: Record<string, string[]> = {
  Comedy: ["funny", "lighthearted", "feel-good"],
  Horror: ["scary", "intense", "suspenseful"],
  Thriller: ["suspenseful", "intense", "gripping"],
  Romance: ["romantic", "feel-good", "emotional"],
  Drama: ["emotional", "thoughtful", "serious"],
  Action: ["exciting", "fast-paced"],
  Adventure: ["exciting", "fun", "epic"],
  "Science Fiction": ["thoughtful", "imaginative", "epic"],
  Fantasy: ["imaginative", "epic", "fun"],
  Documentary: ["educational", "thoughtful"],
  Animation: ["fun", "creative", "lighthearted"],
  Mystery: ["suspenseful", "gripping", "thoughtful"],
  "TV Movie": ["lighthearted", "feel-good"],
  War: ["intense", "serious", "emotional"],
  History: ["educational", "serious", "epic"],
  Music: ["fun", "feel-good", "energetic"],
  Western: ["exciting", "epic"],
  Crime: ["intense", "gripping", "suspenseful"],
  Family: ["fun", "lighthearted", "feel-good"],
};

function computeMoodTags(items: MediaItem[]): DnaMoodTag[] {
  const tagScores = new Map<string, number>();

  for (const item of items) {
    const seen = new Set<string>();
    for (const genre of item.genres) {
      const tags = MOOD_MAP[genre] ?? [];
      for (const tag of tags) {
        if (!seen.has(tag)) {
          seen.add(tag);
          tagScores.set(tag, (tagScores.get(tag) ?? 0) + 1);
        }
      }
    }
    // Shorter runtime = "quick watch"
    if (item.runtimeMinutes && item.runtimeMinutes <= 90) {
      if (!seen.has("quick watch")) {
        tagScores.set("quick watch", (tagScores.get("quick watch") ?? 0) + 1);
      }
    }
  }

  const maxScore = Math.max(1, ...tagScores.values());

  return [...tagScores.entries()]
    .map(([tag, score]) => ({
      tag,
      weight: clampWeight(score / maxScore),
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DnaInput {
  items: MediaItem[];
}

export interface DnaResult {
  genreWeights: GenreWeight[];
  topActors: DnaPerson[];
  topDirectors: DnaPerson[];
  topStudios: DnaStudio[];
  preferredLanguages: string[];
  preferredRuntimeRange: [number, number] | null;
  moodTags: DnaMoodTag[];
}

/**
 * Compute a full DNA profile from a list of media items.
 *
 * This is a pure function — it only reads `items` and returns a structured
 * taste profile. Storage and retrieval are handled by the caller.
 */
export function computeDna(input: DnaInput): DnaResult {
  const { items } = input;

  return {
    genreWeights: computeGenreWeights(items),
    topActors: computeTopPeople(items, "actor"),
    topDirectors: computeTopPeople(items, "director"),
    topStudios: [],
    preferredLanguages: computePreferredLanguages(items),
    preferredRuntimeRange: computeRuntimeRange(items),
    moodTags: computeMoodTags(items),
  };
}

/**
 * Hydrate a list of watchlist-like rows into full MediaItems and then
 * compute DNA. This is the primary entry point called from server actions.
 */
export async function computeDnaFromMediaIds(
  rows: { mediaType: string; mediaId: string }[],
): Promise<DnaResult> {
  const items: MediaItem[] = [];

  for (const row of rows) {
    try {
      const detail = await getMediaDetail(row.mediaType, row.mediaId);
      if (detail) {
        items.push(detail as MediaItem);
      }
    } catch {
      // Skip items that fail to resolve (deleted from TMDB, etc.)
      continue;
    }
  }

  return computeDna({ items });
}