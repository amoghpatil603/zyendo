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
  getDetail: (externalId) => getMovieDetail(externalId),
};

const tvAdapter: MediaAdapter = {
  type: "tv",
  source: "tmdb",
  getDetail: (externalId) => getTvDetail(externalId),
};

const adapters: Record<string, MediaAdapter> = {
  movie: movieAdapter,
  tv: tvAdapter,
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

export async function getMediaDetail(
  type: string,
  externalId: string,
): Promise<MediaDetail | null> {
  const adapter = getAdapter(type);
  if (!adapter) return null;
  return adapter.getDetail(externalId);
}
