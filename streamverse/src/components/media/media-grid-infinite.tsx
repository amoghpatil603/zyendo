"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaCard } from "@/components/media/media-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaItem } from "@/types/media-item";

export interface InfiniteFetcher {
  (page: number): Promise<{ items: MediaItem[]; nextPage: number | null }>;
}

interface MediaGridInfiniteProps {
  fetcher: InfiniteFetcher;
  initialItems?: MediaItem[];
  initialNextPage?: number | null;
  /** Minimum items before we bother mounting the observer sentinel. */
  emptyHint?: string;
  className?: string;
}

/**
 * Infinite-scroll result surface for browse/discovery grids.
 *
 * - Loads the first page immediately (or uses initialItems).
 * - Fetches the next page only when the sentinel nears the viewport.
 * - Dedupes by media type + TMDB id, blocks concurrent requests, and stops
 *   when there are no more pages. Failures preserve existing results and offer
 *   a retry. It does NOT aggressively preload pages.
 */
export function MediaGridInfinite({
  fetcher,
  initialItems = [],
  initialNextPage = 1,
  emptyHint = "No results found with these filters.",
  className,
}: MediaGridInfiniteProps) {
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [nextPage, setNextPage] = useState<number | null>(initialNextPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const pageRef = useRef<number | null>(initialNextPage);
  const dedupRef = useRef<Set<string>>(
    new Set(initialItems.map((i) => `${i.type}:${i.externalId}`)),
  );

  const loadMore = useCallback(async () => {
    const page = pageRef.current;
    if (page === null || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(false);

    try {
      const { items: fetched, nextPage: next } = await fetcher(page);
      setItems((prev) => {
        const merged = [...prev];
        for (const item of fetched) {
          const key = `${item.type}:${item.externalId}`;
          if (dedupRef.current.has(key)) continue;
          dedupRef.current.add(key);
          merged.push(item);
        }
        return merged;
      });
      pageRef.current = next;
      setNextPage(next);
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [fetcher]);

  // Start observing once we have a next page to fetch.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || nextPage === null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextPage, loadMore]);

  return (
    <div className={className}>
      {items.length === 0 && !loading ? (
        <p className="text-center text-sm text-muted-foreground py-4">{emptyHint}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item, i) => (
            <MediaCard key={`${item.type}:${item.externalId}`} item={item} priority={i < 6} />
          ))}
        </div>
      )}

      {/* Sentinel + status row */}
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />

      <div className="mt-4 flex items-center justify-center gap-3 py-2">
        {loading && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading more…
          </span>
        )}
        {!loading && error && (
          <Button variant="secondary" size="sm" onClick={() => void loadMore()}>
            <AlertTriangle className="mr-1 size-3" />
            Retry
          </Button>
        )}
        {!loading && !error && nextPage === null && items.length > 0 && (
          <span className="text-xs text-muted-foreground">You&rsquo;ve reached the end.</span>
        )}
      </div>

      {loading && items.length === 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
