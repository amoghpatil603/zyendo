"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { MediaItem } from "@/types/media-item";
import { Button } from "@/components/ui/button";
import { MediaCard } from "./media-card";
import { Skeleton } from "@/components/ui/skeleton";

export function MediaCarousel({ 
  items,
  hasMore,
  loadingMore,
  onReachEnd
}: { 
  items: MediaItem[];
  hasMore?: boolean;
  loadingMore?: boolean;
  onReachEnd?: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !onReachEnd) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onReachEnd();
        }
      },
      { root: scrollerRef.current, rootMargin: "1200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onReachEnd]);

  function scrollBy(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="group/carousel relative">
      <div
        ref={scrollerRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2"
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)] lg:w-[calc((100%-3rem)/5)] xl:w-[calc((100%-3.75rem)/6)] 2xl:w-[calc((100%-4.5rem)/7)]"
          >
            <MediaCard item={item} priority={i < 6} />
          </div>
        ))}
        
        {loadingMore && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={`skel-${i}`}
                className="aspect-[2/3] w-[calc((100%-0.75rem)/2)] shrink-0 rounded-xl sm:w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)] lg:w-[calc((100%-3rem)/5)] xl:w-[calc((100%-3.75rem)/6)] 2xl:w-[calc((100%-4.5rem)/7)]"
              />
            ))}
          </>
        )}
        
        {hasMore && !loadingMore && <div ref={sentinelRef} className="w-4 shrink-0" />}
      </div>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        className="absolute -left-3 top-1/3 hidden size-9 rounded-full opacity-0 shadow-lg transition group-hover/carousel:opacity-100 md:flex"
      >
        <ChevronLeft className="size-5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        className="absolute -right-3 top-1/3 hidden size-9 rounded-full opacity-0 shadow-lg transition group-hover/carousel:opacity-100 md:flex"
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
