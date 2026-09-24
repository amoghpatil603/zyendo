"use client";

import { useState, useEffect, useCallback } from "react";
import { Gem, Clapperboard, Tv, Sparkles } from "lucide-react";
import type { MediaItem } from "@/types/media-item";
import { MediaCarousel } from "@/components/media/media-carousel";
import { Skeleton } from "@/components/ui/skeleton";

function CarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0 rounded-xl sm:w-44" />
      ))}
    </div>
  );
}

export function HiddenGems() {
  const [data, setData] = useState<{ movies: MediaItem[]; tv: MediaItem[]; anime: MediaItem[] } | null>(null);
  const [active, setActive] = useState<"movies" | "tv" | "anime">("movies");
  const [loading, setLoading] = useState(true);
  
  // Pagination states
  const [nextPages, setNextPages] = useState<{ movies: number | null; tv: number | null; anime: number | null }>({
    movies: 1, tv: 1, anime: 1
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/discovery/feed-actions");
      const d = await mod.getHiddenGems();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  
  const loadMore = useCallback(async () => {
    const pageToLoad = nextPages[active];
    if (!pageToLoad || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const mod = await import("@/lib/discovery/feed-actions");
      const result = await mod.getHiddenGemsPage(active, pageToLoad);
      
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [active]: [...prev[active], ...result.items]
        };
      });
      setNextPages(prev => ({
        ...prev,
        [active]: result.nextPage
      }));
    } finally {
      setLoadingMore(false);
    }
  }, [active, nextPages, loadingMore]);

  const tabs = [
    { key: "movies" as const, label: "Movies", icon: Clapperboard },
    { key: "tv" as const, label: "TV", icon: Tv },
    { key: "anime" as const, label: "Anime", icon: Sparkles },
  ];

  const items = data?.[active] ?? [];
  const currentHasMore = nextPages[active] !== null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Gem className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Hidden Gems</h2>
        <div className="ml-auto flex gap-1 rounded-lg border border-border/60 glass p-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
                  active === tab.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <CarouselSkeleton />
      ) : items.length > 0 ? (
        <MediaCarousel 
          items={items} 
          hasMore={currentHasMore}
          loadingMore={loadingMore}
          onReachEnd={loadMore}
        />
      ) : (
        <p className="text-sm text-muted-foreground py-4">No hidden gems found.</p>
      )}
    </section>
  );
}
