import "server-only";

import type { MediaDetail } from "@/types/media-item";
import { getMovieDetail, getTvDetail } from "./tmdb";

/**
 * A content-vertical adapter. Every vertical (movies, TV, and future
 * verticals like anime/music) registers one, so shared UI and the
 * search/DNA layers can resolve any `MediaItem` uniformly by its type.
 */
export interface MediaAdapter {
  type: string;
  source: string;
  getDetail(externalId: string): Promise<MediaDetail>;
}

const movieAdapter: MediaAdapter = {
  type: "movie",
  source: "tmdb",
  getDetail: (externalId) => getMovieDetail(normalizeExternalId(externalId)),
};

const tvAdapter: MediaAdapter = {
  type: "tv",
  source: "tmdb",
  getDetail: (externalId) => getTvDetail(normalizeExternalId(externalId)),
};

const animeAdapter: MediaAdapter = {
  type: "anime",
  source: "tmdb",
  getDetail: async (externalId) => {
    const detail = await getTvDetail(normalizeExternalId(externalId));
    return { ...detail, type: "anime" as const };
  },
};

const adapters: Record<string, MediaAdapter> = {
  movie: movieAdapter,
  tv: tvAdapter,
  anime: animeAdapter,
};

export function getAdapter(type: string): MediaAdapter | undefined {
  return adapters[type];
}

/** Parse an internal MediaItem id of the form "<type>:<externalId>". */
export function parseMediaId(
  id: string,
): { type: string; externalId: string } | null {
  const idx = id.indexOf(":");
  if (idx === -1) return null;
  return { type: id.slice(0, idx), externalId: id.slice(idx + 1) };
}

/**
 * Normalizes an external ID by URL-decoding it and stripping any known
 * prefixes (e.g. "movie:" or "tv:"), returning the clean numeric ID.
 */
export function normalizeExternalId(id: string): string {
  const decoded = decodeURIComponent(id);
  const match = decoded.match(/^(?:movie|tv):(.+)$/);
  return match ? match[1] : decoded;
}

export async function getMediaDetail(
  type: string,
  externalId: string,
): Promise<MediaDetail | null> {
  const adapter = getAdapter(type);
  if (!adapter) return null;
  return adapter.getDetail(externalId);
}
