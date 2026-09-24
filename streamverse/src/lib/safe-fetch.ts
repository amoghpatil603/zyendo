/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import dns from "dns";

// IPv4 preference for local TMDB / external API ECONNRESET prevention on some networks.
// Only applied in development so Vercel/production uses default routing.
if (process.env.NODE_ENV === "development") {
  dns.setDefaultResultOrder("ipv4first");
}

interface FetchOptions extends RequestInit {
  ttl?: number; // Cache TTL in ms
  revalidate?: number;
  next?: any;
  timeout?: number;
  maxAttempts?: number;
}

interface SharedResponseData {
  status: number;
  statusText: string;
  headers: [string, string][];
  bodyText: string;
}

import { LRUCache } from "lru-cache";

const activeRequests = new Map<string, Promise<SharedResponseData>>();
const memoryCache = new LRUCache<string, { value: any; expiresAt: number }>({
  max: 500,
  ttl: 1000 * 60 * 60 * 24, // 24 hours
});

const MAX_CONCURRENT = 10;
let currentActive = 0;
const requestQueue: Array<() => void> = [];

async function acquireToken(): Promise<void> {
  if (currentActive < MAX_CONCURRENT) {
    currentActive++;
    return;
  }
  return new Promise<void>((resolve) => {
    requestQueue.push(resolve);
  });
}

function releaseToken() {
  currentActive--;
  const next = requestQueue.shift();
  if (next) {
    currentActive++;
    next();
  }
}

/**
 * Highly resilient fetch wrapper for server-side external API requests.
 * Features caching, deduplication, retry with jittered backoff, and timeouts.
 */
export async function safeFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const method = options.method || "GET";

  if (method !== "GET") {
    return fetch(url, options);
  }

  const cacheKey = `${url}_${JSON.stringify(options.headers || {})}`;

  // 1. In-Memory Cache Lookup
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return new Response(JSON.stringify(cached.value), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Determine Max Retries (Reduced to prevent infinite hanging)
  const maxAttempts = options.maxAttempts ?? 2; // Max 2 attempts total for transient errors
  const timeoutMs = options.timeout ?? 8000; // 8 second hard timeout per attempt

  // 2. Request Deduplication
  let activePromise = activeRequests.get(cacheKey);
  if (!activePromise) {
    activePromise = (async () => {
      await acquireToken();
      let overallTimeoutId: NodeJS.Timeout | undefined;
      let controller: AbortController | undefined;
      
      try {
        let attempt = 0;
        let lastError: any = null;

        while (attempt < maxAttempts) {
          attempt++;
          controller = new AbortController();

          // overall read timeout
          overallTimeoutId = setTimeout(() => {
            controller?.abort(new Error("ReadTimeout"));
          }, timeoutMs);

          try {
            const fetchOptions: RequestInit = {
              ...options,
              signal: controller.signal,
            };
            delete (fetchOptions as any).ttl;
            delete (fetchOptions as any).timeout;
            delete (fetchOptions as any).maxAttempts;
            if (options.revalidate !== undefined) {
              fetchOptions.next = { ...(options.next || {}), revalidate: options.revalidate };
              delete (fetchOptions as any).revalidate;
            }

            let response: Response;
            try {
              response = await fetch(url, fetchOptions);
            } catch (error: any) {
              throw error;
            } finally {
              clearTimeout(overallTimeoutId);
            }

            if (response.ok) {
              const bodyText = await response.text();
              try {
                const jsonVal = JSON.parse(bodyText);
                let ttl = 5 * 60 * 1000;
                if (url.includes("/genre/")) {
                  ttl = 7 * 24 * 60 * 60 * 1000;
                } else if (url.includes("/movie/") || url.includes("/tv/")) {
                  if (url.includes("/similar") || url.includes("/recommendations")) {
                    ttl = 6 * 60 * 60 * 1000;
                  } else {
                    ttl = 24 * 60 * 60 * 1000;
                  }
                } else if (url.includes("/trending/")) {
                  ttl = 15 * 60 * 1000;
                } else if (url.includes("/search")) {
                  ttl = 0; // Search caches explicitly handle their own logic usually
                }

                const finalTtl = options.ttl !== undefined ? options.ttl : ttl;
                if (finalTtl > 0) {
                  memoryCache.set(cacheKey, {
                    value: jsonVal,
                    expiresAt: Date.now() + finalTtl,
                  });
                }
              } catch {}

              const headersList: [string, string][] = [];
              response.headers.forEach((value, key) => {
                headersList.push([key, value]);
              });

              return {
                status: response.status,
                statusText: response.statusText,
                headers: headersList,
                bodyText,
              };
            }

            if (
              response.status === 400 ||
              response.status === 401 ||
              response.status === 403 ||
              response.status === 404
            ) {
              const bodyText = await response.text();
              const headersList: [string, string][] = [];
              response.headers.forEach((value, key) => {
                headersList.push([key, value]);
              });
              return {
                status: response.status,
                statusText: response.statusText,
                headers: headersList,
                bodyText,
              };
            }

            if (
              response.status === 429 ||
              response.status === 500 ||
              response.status === 502 ||
              response.status === 503 ||
              response.status === 504
            ) {
              throw new Error(`TransientStatus:${response.status}`);
            }

            throw new Error(`UnexpectedNonOKStatus:${response.status} ${response.statusText}`);
          } catch (error: any) {
            clearTimeout(overallTimeoutId);
            lastError = error;
            
            const errorName = error?.name || error?.cause?.name;
            const errorMessage = `${error?.message || ""} ${error?.cause?.message || ""} ${error?.cause?.code || ""}`;

            const isTimeout =
              errorName === "AbortError" ||
              errorMessage.includes("Timeout") ||
              errorName === "TimeoutError" ||
              errorMessage.includes("ETIMEDOUT") ||
              errorMessage.includes("ReadTimeout");
            const isConnReset = errorMessage.includes("ECONNRESET") || errorMessage.includes("fetch failed");
            const isTransientStatus = (error?.message || "").startsWith("TransientStatus:");

            if (!isTimeout && !isConnReset && !isTransientStatus) {
              throw error;
            }

            if (attempt === maxAttempts) {
              break;
            }

            // Short randomized backoff
            const backoff = Math.pow(2, attempt) * 300 + Math.random() * 200;
            await new Promise((resolve) => setTimeout(resolve, backoff));
          }
        }

        console.error(`[safeFetch] Request to ${url} failed after ${maxAttempts} attempts. Last Error: ${lastError?.message || lastError}`);

        const fallbackBody = JSON.stringify({
          error: "Upstream request failed",
          details: lastError?.message || "Unknown error",
        });

        return {
          status: 502,
          statusText: "Bad Gateway",
          headers: [["Content-Type", "application/json"]],
          bodyText: fallbackBody,
        };
      } finally {
        releaseToken();
        // Always remove the active promise when done to prevent memory leaks
        activeRequests.delete(cacheKey);
      }
    })();

    activeRequests.set(cacheKey, activePromise);
  }

  // Ensure if an error propagates, it doesn't leave the activeRequests dirty
  // But wait, the finally block inside the promise already deletes it!
  const resData = await activePromise;
  return new Response(resData.bodyText, {
    status: resData.status,
    statusText: resData.statusText,
    headers: resData.headers,
  });
}
