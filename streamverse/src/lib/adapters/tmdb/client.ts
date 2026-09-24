import "server-only";

import { serverEnv, isTmdbConfigured } from "@/lib/env";
import { safeFetch } from "@/lib/safe-fetch";

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

export async function instrumentedFetch(
  url: URL | string,
  options: RequestInit = {},
): Promise<Response> {
  const method = options.method || "GET";
  const urlStr = typeof url === "string" ? url : url.toString();
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const clone = response.clone();
      const body = await clone.text().catch(() => "");
      const errorMsg = `[Fetch Error] HTTP ${method} ${urlStr} failed with status ${response.status}. Body: ${body.slice(
        0,
        500,
      )}`;
      const stack = new Error().stack;
      console.error(errorMsg, "\nStack Trace:", stack);
    }
    return response;
  } catch (error) {
    const stack = error instanceof Error ? error.stack : new Error().stack;
    console.error(
      `[Fetch Exception] HTTP ${method} ${urlStr} failed. Error:`,
      error,
      "\nStack Trace:",
      stack,
    );
    throw error;
  }
}

interface TmdbRequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  /** Cache TTL in seconds. Defaults to 1 hour; pass 0 to disable caching. */
  revalidate?: number;
  timeout?: number;
  maxAttempts?: number;
}

const inflightRequests = new Map<string, Promise<any>>();

/**
 * Low-level TMDB request helper. All external calls are server-side only so the
 * API credentials are never exposed to the browser. Responses are cached via the
 * Next.js data cache to avoid rate limits and reduce latency.
 */
export async function tmdbFetch<T>(
  path: string,
  { params = {}, revalidate = 3600, timeout, maxAttempts }: TmdbRequestOptions = {},
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

  const urlString = url.toString();

  // Deduplicate inflight requests to same URL
  if (inflightRequests.has(urlString)) {
    return inflightRequests.get(urlString) as Promise<T>;
  }

  const fetchPromise = (async () => {
    const headers: Record<string, string> = { accept: "application/json" };
    const readToken = serverEnv.tmdbReadToken;
    if (readToken) {
      headers.authorization = `Bearer ${readToken}`;
    } else {
      // Fall back to the v3 API key as a query parameter.
      url.searchParams.set("api_key", serverEnv.tmdbApiKey as string);
    }

    const res = await safeFetch(url.toString(), {
      headers,
      revalidate,
      timeout,
      maxAttempts,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `TMDB request failed (${res.status} ${res.statusText}) for ${path}: ${body.slice(0, 200)}`,
      );
    }

    return (await res.json()) as T;
  })();

  inflightRequests.set(urlString, fetchPromise);

  try {
    return await fetchPromise;
  } finally {
    inflightRequests.delete(urlString);
  }
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
