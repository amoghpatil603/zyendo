"use client";

import { useState, useEffect, useCallback } from "react";
import { Award, Film, Tv, Play } from "lucide-react";
import { MediaCarousel } from "@/components/media/media-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaItem } from "@/types/media-item";

interface FeaturedContent {
  movies: MediaItem[];
  tv: MediaItem[];
  anime: MediaItem[];
}

function CarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0 rounded-xl sm:w-44" />
      ))}
    </div>
  );
}

export function EditorPicks() {
  const [featured, setFeatured] = useState<FeaturedContent>({
    movies: [],
    tv: [],
    anime: [],
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/discovery/cms-resolver");
      const data = await mod.getResolvedFeaturedContent();
      setFeatured(data);
    } catch {
      setFeatured({ movies: [], tv: [], anime: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Don't render if no featured content at all
  if (!loading && featured.movies.length === 0 && featured.tv.length === 0 && featured.anime.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <Award className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Editor's Picks</h2>
      </div>

      {loading ? (
        <CarouselSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Movies */}
          {featured.movies.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Film className="size-4 text-primary" />
                <h3 className="text-base font-medium">Movies</h3>
              </div>
              <MediaCarousel items={featured.movies} />
            </div>
          )}

          {/* TV Shows */}
          {featured.tv.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Tv className="size-4 text-primary" />
                <h3 className="text-base font-medium">TV Shows</h3>
              </div>
              <MediaCarousel items={featured.tv} />
            </div>
          )}

          {/* Anime */}
          {featured.anime.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Play className="size-4 text-primary" />
                <h3 className="text-base font-medium">Anime</h3>
              </div>
              <MediaCarousel items={featured.anime} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}