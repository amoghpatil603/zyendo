import "server-only";

import { serverEnv, isTmdbConfigured } from "@/lib/env";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export class TmdbNotConfiguredError extends Error {
  constructor() {
    super(
      "TMDB is not configured. Set TMDB_API_READ_ACCESS_TOKEN or TMDB_API_KEY in your environment.",
    );
    this.name = "TmdbNotConfiguredError";
  }
}

interface TmdbRequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  /** Cache TTL in seconds. Defaults to 1 hour; pass 0 to disable caching. */
  revalidate?: number;
}

/**
 * Low-level TMDB request helper. All external calls are server-side only so the
 * API credentials are never exposed to the browser. Responses are cached via the
 * Next.js data cache to avoid rate limits and reduce latency.
 */
export async function tmdbFetch<T>(
  path: string,
  { params = {}, revalidate = 3600 }: TmdbRequestOptions = {},
): Promise<T> {
  if (!isTmdbConfigured()) {
    throw new TmdbNotConfiguredError();
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = { accept: "application/json" };
  const readToken = serverEnv.tmdbReadToken;
  if (readToken) {
    headers.authorization = `Bearer ${readToken}`;
  } else {
    // Fall back to the v3 API key as a query parameter.
    url.searchParams.set("api_key", serverEnv.tmdbApiKey as string);
  }

  const res = await fetch(url, {
    headers,
    next: { revalidate },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `TMDB request failed (${res.status} ${res.statusText}) for ${path}: ${body.slice(0, 200)}`,
    );
  }

  return (await res.json()) as T;
}

export function tmdbImageUrl(
  path: string | null | undefined,
  size:
    | "w92"
    | "w154"
    | "w185"
    | "w300"
    | "w342"
    | "w500"
    | "w780"
    | "w1280"
    | "original" = "w500",
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
