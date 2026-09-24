"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp, Flame, Calendar, Globe, MapPin, Film } from "lucide-react";
import type { MediaItem } from "@/types/media-item";
import { MediaCarousel } from "@/components/media/media-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExpandedTrendingParams, ExpandedTrendingResult } from "@/lib/discovery/feed-actions";

interface CombinedGenre {
  name: string;
  movieGenreId?: number;
  tvGenreId?: number;
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

type TimeRange = "today" | "week" | "month";
type Region = "worldwide" | "india";

const TIME_TABS: { key: TimeRange; label: string; icon: typeof Flame }[] = [
  { key: "today", label: "Today", icon: Flame },
  { key: "week", label: "This Week", icon: Calendar },
  { key: "month", label: "This Month", icon: TrendingUp },
];

const REGION_OPTIONS: { value: Region; label: string }[] = [
  { value: "worldwide", label: "Worldwide" },
  { value: "india", label: "India" },
];

export function TrendingSection() {
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [region, setRegion] = useState<Region>("worldwide");
  const [selectedGenre, setSelectedGenre] = useState<CombinedGenre | null>(null);
  const [combinedGenres, setCombinedGenres] = useState<CombinedGenre[]>([]);

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Track the current request to cancel/ignore stale ones
  const requestIdRef = useRef(0);

  // Load combined genres via server action on mount
  useEffect(() => {
    async function loadGenres() {
      try {
        const mod = await import("@/lib/discovery/feed-actions");
        const genres = await mod.getCombinedGenresAction();
        setCombinedGenres(genres);
      } catch {
        // Genres are non-critical; component works without them
      }
    }
    loadGenres();
  }, []);

  const load = useCallback(async (params: ExpandedTrendingParams, append = false) => {
    const requestId = ++requestIdRef.current;
    if (!append) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const mod = await import("@/lib/discovery/feed-actions");
      const result: ExpandedTrendingResult = await mod.getExpandedTrendingFeed(params);

      // Ignore stale responses
      if (requestId !== requestIdRef.current) return;

      if (append) {
        setItems((prev) => {
          // Deduplicate by id
          const existingIds = new Set(prev.map((i) => i.id));
          const newItems = result.items.filter((i) => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      } else {
        setItems(result.items);
      }
      setNextPage(result.nextPage);
    } catch {
      if (requestId !== requestIdRef.current) return;
      // Preserve already-loaded results during transient failures
      if (!append && items.length === 0) {
        setError("Failed to load trending data.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [items.length]);

  // Reload when filters change (reset pagination)
  useEffect(() => {
    load({ timeRange, region, genreId: selectedGenre?.movieGenreId ?? selectedGenre?.tvGenreId, page: 1 }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, region, selectedGenre]);

  // Load more (infinite scroll)
  const loadMore = useCallback(() => {
    if (nextPage === null || loadingMore) return;
    load({ timeRange, region, genreId: selectedGenre?.movieGenreId ?? selectedGenre?.tvGenreId, page: nextPage }, true);
  }, [nextPage, loadingMore, timeRange, region, selectedGenre, load]);

  // Intersection observer logic is now handled by MediaCarousel

  return (
    <section className="space-y-4">
      {/* Header + Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5 text-primary shrink-0" />
          <h2 className="text-lg font-semibold">Trending</h2>
        </div>

        {/* Time range tabs */}
        <div className="flex gap-1 rounded-lg border border-border/60 glass p-0.5 overflow-x-auto no-scrollbar">
          {TIME_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setTimeRange(tab.key)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
                  timeRange === tab.key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Region + Genre controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Region */}
        <div className="flex items-center gap-1.5">
          {region === "worldwide" ? (
            <Globe className="size-3.5 text-muted-foreground shrink-0" />
          ) : (
            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
          )}
          <Select
            value={region}
            onValueChange={(v: Region) => {
              setRegion(v);
              setSelectedGenre(null);
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Genre */}
        <div className="flex items-center gap-1.5">
          <Film className="size-3.5 text-muted-foreground shrink-0" />
          <Select
            value={selectedGenre ? `${selectedGenre.movieGenreId ?? selectedGenre.tvGenreId}` : "all"}
            onValueChange={(v) => {
              if (v === "all") {
                setSelectedGenre(null);
              } else {
                const genre = combinedGenres.find(
                  (g) => String(g.movieGenreId ?? g.tvGenreId) === v,
                );
                setSelectedGenre(genre ?? null);
              }
            }}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="All Genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Genres</SelectItem>
              {combinedGenres.map((g) => (
                <SelectItem
                  key={g.movieGenreId ?? g.tvGenreId}
                  value={String(g.movieGenreId ?? g.tvGenreId)}
                  className="text-xs"
                >
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <CarouselSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => load({ timeRange, region, genreId: selectedGenre?.movieGenreId ?? selectedGenre?.tvGenreId, page: 1 }, false)}
            className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Try again
          </button>
        </div>
      ) : items.length > 0 ? (
        <>
          <MediaCarousel 
            items={items} 
            hasMore={nextPage !== null} 
            loadingMore={loadingMore} 
            onReachEnd={loadMore} 
          />
        </>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No trending content available for this selection.
        </p>
      )}
    </section>
  );
}