import "server-only";

import { isSupabaseConfigured, isTmdbConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { safeList } from "@/lib/safe";
import { getWatchHistory } from "@/lib/watch-history";
import type { MediaItem } from "@/types/media-item";
import {
  getMovieRecommendations,
  getSimilarMovies,
  getTvRecommendations,
  getSimilarTv,
  getMovieCredits,
  getTvCredits,
  getPersonCombinedCredits,
  getMovieCollectionId,
  getCollectionItems,
  getCollection,
} from "@/lib/adapters/tmdb";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContinueExploringSection {
  title: string;
  subtitle: string;
  items: MediaItem[];
}

export interface ContinueExploringData {
  sections: ContinueExploringSection[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deduplicate items by mediaType + externalId. */
function deduplicate(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}-${item.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Exclude items matching a given externalId and type. */
function excludeSource(
  items: MediaItem[],
  sourceExternalId: string,
  sourceType: string,
): MediaItem[] {
  return items.filter(
    (item) => !(item.externalId === sourceExternalId && item.type === sourceType),
  );
}

/**
 * Pick a deterministic element from an array based on a seed.
 * Uses date-based seed for stable daily selection.
 */
function pickDeterministic<T>(arr: T[], seed: number): T | undefined {
  if (!arr.length) return undefined;
  return arr[seed % arr.length];
}

/**
 * Select the best liked item deterministically.
 * Priority: highest rating, then most recent interaction.
 */
function selectBestLiked(liked: Array<{ rating: number | null; watchedAt: string | null; title: string; mediaId: string; mediaType: string }>): typeof liked[0] | undefined {
  if (!liked.length) return undefined;
  // Sort by rating (desc), then by watchedAt (desc for most recent)
  const sorted = [...liked].sort((a, b) => {
    const ratingA = a.rating ?? 0;
    const ratingB = b.rating ?? 0;
    if (ratingB !== ratingA) return ratingB - ratingA;
    // If ratings equal, prefer more recent
    const dateA = a.watchedAt ? new Date(a.watchedAt).getTime() : 0;
    const dateB = b.watchedAt ? new Date(b.watchedAt).getTime() : 0;
    return dateB - dateA;
  });
  return sorted[0];
}

// ---------------------------------------------------------------------------
// Section Builders
// ---------------------------------------------------------------------------

/**
 * 1. Because You Watched...
 * Uses recent watch history to find a source title, then fetches
 * recommendations/similar from TMDB.
 */
async function buildBecauseYouWatched(
  allSeen: Set<string>,
): Promise<ContinueExploringSection | null> {
  if (!isTmdbConfigured()) return null;

  const history = await getWatchHistory({ limit: 20 });
  if (!history.length) return null;

  // Find a recently watched item with a valid TMDB numeric ID
  const source = history.find((h) => /^\d+$/.test(h.mediaId));
  if (!source) return null;

  const externalId = Number(source.mediaId);
  const mediaType = source.mediaType === "tv" ? "tv" : "movie";

  let items: MediaItem[] = [];
  if (mediaType === "movie") {
    const [recs, similar] = await Promise.all([
      safeList(() => getMovieRecommendations(externalId)),
      safeList(() => getSimilarMovies(externalId)),
    ]);
    items = [...recs, ...similar];
  } else {
    const [recs, similar] = await Promise.all([
      safeList(() => getTvRecommendations(externalId)),
      safeList(() => getSimilarTv(externalId)),
    ]);
    items = [...recs, ...similar];
  }

  items = deduplicate(items);
  items = excludeSource(items, source.mediaId, mediaType);
  items = items.filter((item) => !allSeen.has(`${item.type}-${item.externalId}`));
  items.forEach((item) => allSeen.add(`${item.type}-${item.externalId}`));

  if (!items.length) return null;

  return {
    title: "Because You Watched",
    subtitle: source.title,
    items: items.slice(0, 10),
  };
}

/**
 * 2. Because You Liked...
 * Uses watch history entries with high ratings (7+) as "liked" signals.
 * Deterministic selection: highest rating, then most recent interaction.
 */
async function buildBecauseYouLiked(
  allSeen: Set<string>,
): Promise<ContinueExploringSection | null> {
  if (!isTmdbConfigured()) return null;

  const history = await getWatchHistory({ limit: 50 });
  // Only items with a rating >= 7 are considered "liked"
  const liked = history.filter((h) => h.rating !== null && h.rating >= 7 && /^\d+$/.test(h.mediaId));
  if (!liked.length) return null;

  // Deterministic selection: highest rating, then most recent
  const source = selectBestLiked(liked);
  if (!source) return null;

  const externalId = Number(source.mediaId);
  const mediaType = source.mediaType === "tv" ? "tv" : "movie";

  let items: MediaItem[] = [];
  if (mediaType === "movie") {
    const [recs, similar] = await Promise.all([
      safeList(() => getMovieRecommendations(externalId)),
      safeList(() => getSimilarMovies(externalId)),
    ]);
    items = [...recs, ...similar];
  } else {
    const [recs, similar] = await Promise.all([
      safeList(() => getTvRecommendations(externalId)),
      safeList(() => getSimilarTv(externalId)),
    ]);
    items = [...recs, ...similar];
  }

  items = deduplicate(items);
  items = excludeSource(items, source.mediaId, mediaType);
  items = items.filter((item) => !allSeen.has(`${item.type}-${item.externalId}`));
  items.forEach((item) => allSeen.add(`${item.type}-${item.externalId}`));

  if (!items.length) return null;

  return {
    title: "Because You Liked",
    subtitle: source.title,
    items: items.slice(0, 10),
  };
}

/**
 * 3. More From This Director
 * Finds a director from a recently watched or highly rated title's credits.
 */
async function buildMoreFromDirector(
  allSeen: Set<string>,
): Promise<ContinueExploringSection | null> {
  if (!isTmdbConfigured()) return null;

  const history = await getWatchHistory({ limit: 20 });
  if (!history.length) return null;

  // Try to find a source with a valid numeric ID
  const source = history.find((h) => /^\d+$/.test(h.mediaId));
  if (!source) return null;

  const externalId = Number(source.mediaId);
  const mediaType = source.mediaType === "tv" ? "tv" : "movie";

  let credits;
  try {
    credits = mediaType === "movie"
      ? await getMovieCredits(externalId)
      : await getTvCredits(externalId);
  } catch {
    return null;
  }

  if (!credits?.crew?.length) return null;

  // Find the director
  const director = credits.crew.find(
    (c) => c.job === "Director" || c.job === "Creator",
  );
  if (!director) return null;

  let items = await safeList(() => getPersonCombinedCredits(director.id));
  items = deduplicate(items);
  items = excludeSource(items, source.mediaId, mediaType);
  items = items.filter((item) => !allSeen.has(`${item.type}-${item.externalId}`));
  items.forEach((item) => allSeen.add(`${item.type}-${item.externalId}`));

  if (!items.length) return null;

  return {
    title: "More From",
    subtitle: director.name,
    items: items.slice(0, 10),
  };
}

/**
 * 4. More With This Actor
 * Finds a prominent actor from a recently watched or highly rated title.
 */
async function buildMoreWithActor(
  allSeen: Set<string>,
): Promise<ContinueExploringSection | null> {
  if (!isTmdbConfigured()) return null;

  const history = await getWatchHistory({ limit: 20 });
  if (!history.length) return null;

  const source = history.find((h) => /^\d+$/.test(h.mediaId));
  if (!source) return null;

  const externalId = Number(source.mediaId);
  const mediaType = source.mediaType === "tv" ? "tv" : "movie";

  let credits;
  try {
    credits = mediaType === "movie"
      ? await getMovieCredits(externalId)
      : await getTvCredits(externalId);
  } catch {
    return null;
  }

  if (!credits?.cast?.length) return null;

  // Pick a prominent actor
  const actor = credits.cast[0];
  if (!actor) return null;

  let items = await safeList(() => getPersonCombinedCredits(actor.id));
  items = deduplicate(items);
  items = excludeSource(items, source.mediaId, mediaType);
  items = items.filter((item) => !allSeen.has(`${item.type}-${item.externalId}`));
  items.forEach((item) => allSeen.add(`${item.type}-${item.externalId}`));

  if (!items.length) return null;

  return {
    title: "More With",
    subtitle: actor.name,
    items: items.slice(0, 10),
  };
}

/**
 * 5. More From This Universe / Franchise
 * Uses real TMDB collection metadata.
 */
async function buildMoreFromFranchise(
  allSeen: Set<string>,
): Promise<ContinueExploringSection | null> {
  if (!isTmdbConfigured()) return null;

  const history = await getWatchHistory({ limit: 20 });
  if (!history.length) return null;

  // Only movies can belong to collections
  const movieSource = history.find(
    (h) => h.mediaType === "movie" && /^\d+$/.test(h.mediaId),
  );
  if (!movieSource) return null;

  const movieId = Number(movieSource.mediaId);
  const collectionId = await getMovieCollectionId(movieId);
  if (!collectionId) return null;

  const collection = await getCollection(collectionId);
  if (!collection || !collection.parts?.length) return null;

  let items = await safeList(() => getCollectionItems(collectionId));
  items = deduplicate(items);
  items = excludeSource(items, movieSource.mediaId, "movie");
  items = items.filter((item) => !allSeen.has(`${item.type}-${item.externalId}`));
  items.forEach((item) => allSeen.add(`${item.type}-${item.externalId}`));

  if (!items.length) return null;

  return {
    title: "More From",
    subtitle: collection.name,
    items: items.slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Builds the Continue Exploring sections for the current user.
 * Each section is fetched independently — a failure in one does not affect others.
 * For signed-out users, returns empty sections (no fabricated personalization).
 */
export async function getContinueExploringSections(): Promise<ContinueExploringData> {
  const sections: ContinueExploringSection[] = [];
  const allSeen = new Set<string>();

  // Check authentication
  if (!isSupabaseConfigured()) {
    return { sections: [] };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { sections: [] };
  }

  if (!isTmdbConfigured()) {
    return { sections: [] };
  }

  // Fetch all sections in parallel, each isolated
  const results = await Promise.allSettled([
    buildBecauseYouWatched(allSeen),
    buildBecauseYouLiked(allSeen),
    buildMoreFromDirector(allSeen),
    buildMoreWithActor(allSeen),
    buildMoreFromFranchise(allSeen),
  ]);

  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== null) {
      sections.push(result.value);
    }
  }

  return { sections };
}