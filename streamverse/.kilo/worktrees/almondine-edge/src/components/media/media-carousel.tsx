"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { MediaItem } from "@/types/media-item";
import { Button } from "@/components/ui/button";
import { MediaCard } from "./media-card";

export function MediaCarousel({ items }: { items: MediaItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

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
            className="w-[42vw] shrink-0 snap-start sm:w-44 md:w-48"
          >
            <MediaCard item={item} priority={i < 6} />
          </div>
        ))}
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
