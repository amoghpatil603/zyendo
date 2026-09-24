"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MediaItem } from "@/types/media-item";
import { MediaRow } from "@/components/media/media-row";
import { fetchMediaByCategory } from "@/app/actions/tmdb";

interface InfiniteHomeSectionProps {
  title: string;
  subtitle: string;
  initialItems: MediaItem[];
  category: string;
  genreId?: number;
  href?: string;
}

export function InfiniteHomeSection({
  title,
  subtitle,
  initialItems,
  category,
  genreId,
  href,
}: InfiniteHomeSectionProps) {
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const loadingRef = useRef(false);

  // Only reset if the actual category or genre changes, or if the first item fundamentally changes.
  useEffect(() => {
    if (initialItems[0]?.id !== items[0]?.id) {
      setItems(initialItems);
      setPage(1);
      setHasMore(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItems]); // intentional: only check when initialItems reference changes

  const loadMoreItems = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const newItems = await fetchMediaByCategory(category, nextPage, genreId);

      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => {
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
      console.error("Failed to load more items:", error);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [category, genreId, hasMore, page]);

  return (
    <>
      <MediaRow
        title={title}
        subtitle={subtitle}
        items={items}
        href={href}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onReachEnd={loadMoreItems}
      />

      {!hasMore && items.length > 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          You&rsquo;ve reached the end
        </p>
      )}
    </>
  );
}