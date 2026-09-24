"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import type { MediaItem } from "@/types/media-item";
import { MediaCard } from "./media-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchMediaByCategory } from "@/app/actions/tmdb";

interface InfiniteMediaGridProps {
  items: MediaItem[];
  category: string;
  genreId?: number;
  priorityCount?: number;
  className?: string;
}

export function InfiniteMediaGrid({
  items,
  category,
  genreId,
  priorityCount = 0,
  className,
}: InfiniteMediaGridProps) {
  const [displayedItems, setDisplayedItems] = useState<MediaItem[]>(items);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // Strict concurrency control
  const loadingRef = useRef(false);
  const requestedPagesRef = useRef<Set<number>>(new Set([1]));

  useEffect(() => {
    setDisplayedItems(items);
    setPage(1);
    setHasMore(true);
    loadingRef.current = false;
    requestedPagesRef.current = new Set([1]);
  }, [items, category, genreId]);

  const loadMoreItems = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    
    const nextPage = page + 1;
    if (requestedPagesRef.current.has(nextPage)) return; // Prevent request storm

    loadingRef.current = true;
    setLoadingMore(true);
    requestedPagesRef.current.add(nextPage);

    try {
      const newItems = await fetchMediaByCategory(category, nextPage, genreId);

      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setDisplayedItems((prev) => {
          const seen = new Set(prev.map((item) => `${item.type}:${item.externalId}`));
          const unique = newItems.filter((item) => {
            const key = `${item.type}:${item.externalId}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return [...prev, ...unique];
        });
        setPage(nextPage);
      }
    } catch (error) {
      console.error(`Failed to load page ${nextPage}:`, error);
      // On failure, remove from requested pages so it can be retried
      requestedPagesRef.current.delete(nextPage);
      // We don't advance the page counter on failure
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [category, genreId, hasMore, page]);

  return (
    <div className={cn("w-full", className)}>
      <VirtuosoGrid
        useWindowScroll
        data={displayedItems}
        endReached={loadMoreItems}
        overscan={400} // Fetch a bit ahead to keep scrolling smooth
        listClassName="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        itemContent={(index, item) => (
          <MediaCard key={item.id} item={item} priority={index < priorityCount} />
        )}
        components={{
          Footer: () => (
            <div className="mt-6 w-full pb-8">
              {loadingMore && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={`skeleton-${i}`} className="aspect-[2/3] w-full rounded-xl" />
                  ))}
                </div>
              )}
              {!hasMore && displayedItems.length > 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  You've reached the end
                </p>
              )}
            </div>
          ),
        }}
      />
    </div>
  );
}