"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MediaItem } from "@/types/media-item";
import { MediaCard } from "./media-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface InfiniteMediaRowProps {
  items: MediaItem[];
  loadMore: () => Promise<MediaItem[]>;
  hasMore: boolean;
  title: string;
  subtitle?: string;
  priorityCount?: number;
  className?: string;
}

export function InfiniteMediaRow({
  items,
  loadMore,
  hasMore,
  title,
  subtitle,
  priorityCount = 0,
  className,
}: InfiniteMediaRowProps) {
  const [displayedItems, setDisplayedItems] = useState<MediaItem[]>(items);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreItems, setHasMoreItems] = useState(hasMore);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayedItems(items);
  }, [items]);

  const loadMoreItems = useCallback(async () => {
    if (loadingMore || !hasMoreItems) return;

    setLoadingMore(true);
    try {
      const newItems = await loadMore();
      if (newItems.length === 0) {
        setHasMoreItems(false);
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
      }
    } catch (error) {
      console.error("Failed to load more items:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadMore, loadingMore, hasMoreItems]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreItems && !loadingMore) {
          void loadMoreItems();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreItems, loadingMore, loadMoreItems]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="relative">
        <div
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {displayedItems.map((item, i) => (
            <div
              key={item.id}
              className="shrink-0"
              style={{ width: "calc((100% - 3rem) / 4)" }}
            >
              <MediaCard
                item={item}
                priority={i < priorityCount}
              />
            </div>
          ))}
          {hasMoreItems && !loadingMore && <div ref={sentinelRef} className="w-1 shrink-0" />}
          {loadingMore && (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={`skel-${i}`}
                  className="aspect-[2/3] shrink-0 rounded-xl"
                  style={{ width: "calc((100% - 3rem) / 4)" }}
                />
              ))}
            </>
          )}
        </div>
        
        {!hasMoreItems && displayedItems.length > 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            You have reached the end
          </p>
        )}
      </div>
    </div>
  );
}
