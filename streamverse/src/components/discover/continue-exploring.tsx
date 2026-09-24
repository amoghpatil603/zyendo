"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import type { MediaItem } from "@/types/media-item";
import { MediaCarousel } from "@/components/media/media-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContinueExploringSection, ContinueExploringData } from "@/lib/discovery/continue-exploring";

function CarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0 rounded-xl sm:w-44" />
      ))}
    </div>
  );
}

export function ContinueExploring() {
  const [sections, setSections] = useState<ContinueExploringSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const mod = await import("@/lib/discovery/feed-actions");
        const result: ContinueExploringData = await mod.getContinueExploringSectionsAction();
        if (!cancelled) {
          setSections(result.sections);
        }
      } catch {
        if (!cancelled) {
          setSections([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Continue Exploring</h2>
        </div>
        <CarouselSkeleton />
      </section>
    );
  }

  if (!sections.length) {
    return null;
  }

  return (
    <>
      {sections.map((section, i) => (
        <section key={i} className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {section.title}
            </h2>
            {section.subtitle && (
              <span className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                {section.subtitle}
              </span>
            )}
          </div>
          <MediaCarousel items={section.items} />
        </section>
      ))}
    </>
  );
}