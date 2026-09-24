"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { SearchX, Loader2 } from "lucide-react";

import type { SearchResults } from "@/lib/adapters/tmdb";
import { MediaGrid } from "@/components/media/media-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/empty-state";

export function InfiniteSearchResults({
  query,
  initialData,
}: {
  query: string;
  initialData: SearchResults;
}) {
  const [data, setData] = useState<SearchResults>(initialData);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingPageRef = useRef<number | null>(null);

  const hasMore = page < data.totalPages;
  useEffect(() => {
    console.log("[Search Debug]", {
      currentPage: page,
      totalPages: data.totalPages,
      loadedItems: data.all.length,
      hasMore,
      loadingMore,
      isLoadingRefCurrent: isLoadingRef.current,
      loadingPage: loadingPageRef.current,
    });
  }, [page, data.totalPages, data.all.length, hasMore, loadingMore]);

  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    // Prevent duplicate/concurrent runs
    if (isLoadingRef.current || loadingMore || !hasMore || loadingPageRef.current === nextPage) return;

    isLoadingRef.current = true;
    loadingPageRef.current = nextPage;
    setLoadingMore(true);
    setError(null);

    // Cancel any previous unfinished search request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&page=${nextPage}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(`Failed to load more results. HTTP ${response.status}`);
      }

      const result = (await response.json()) as SearchResults;

      if (result) {
        setData((prev) => {
          // Prevent duplicates
          const newAll = [...prev.all];
          const newMovies = [...prev.movies];
          const newTv = [...prev.tv];
          const newAnime = [...prev.anime];
          const newActors = [...prev.actors];

          const existingAllIds = new Set(prev.all.map((item) => item.id));
          const existingMovieIds = new Set(prev.movies.map((item) => item.id));
          const existingTvIds = new Set(prev.tv.map((item) => item.id));
          const existingAnimeIds = new Set(prev.anime.map((item) => item.id));
          const existingActorIds = new Set(prev.actors.map((item) => item.id));

          for (const item of result.all) {
            if (!existingAllIds.has(item.id)) newAll.push(item);
          }
          for (const item of result.movies) {
            if (!existingMovieIds.has(item.id)) newMovies.push(item);
          }
          for (const item of result.tv) {
            if (!existingTvIds.has(item.id)) newTv.push(item);
          }
          for (const item of result.anime) {
            if (!existingAnimeIds.has(item.id)) newAnime.push(item);
          }
          for (const item of result.actors) {
            if (!existingActorIds.has(item.id)) newActors.push(item);
          }

          return {
            all: newAll,
            movies: newMovies,
            tv: newTv,
            anime: newAnime,
            actors: newActors,
            totalResults: result.totalResults,
            totalPages: result.totalPages,
          };
        });
        setPage(nextPage);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // Silently catch Abort errors from AbortController
        return;
      }
      setError(
        err instanceof Error ? err : new Error("Failed to load more results")
      );
    } finally {
      setLoadingMore(false);
      isLoadingRef.current = false;
      loadingPageRef.current = null;
    }
  }, [query, page, hasMore, loadingMore]);

  // Clean up any ongoing request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (data.all.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={`No results for "${query}"`}
        description="Check your spelling or try a different title."
      />
    );
  }

  const Footer = () => (
    <div className="flex justify-center py-8 text-sm text-muted-foreground w-full">
      {error ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-destructive">Failed to load more results.</p>
          <button
            onClick={() => loadMore()}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : loadingMore ? (
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          <span>Loading more...</span>
        </div>
      ) : !hasMore && data.all.length > 0 ? (
        <p>You&apos;ve reached the end of the results.</p>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Showing {data.all.length} of {data.totalResults.toLocaleString()} results for{" "}
        <span className="font-medium text-foreground">&quot;{query}&quot;</span>
      </p>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({data.all.length})</TabsTrigger>
          <TabsTrigger value="movies">
            Movies ({data.movies.length})
          </TabsTrigger>
          <TabsTrigger value="tv">TV ({data.tv.length})</TabsTrigger>
          <TabsTrigger value="anime">Anime ({data.anime.length})</TabsTrigger>
          <TabsTrigger value="actors">Actors ({data.actors.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="pt-4">
          <MediaGrid items={data.all} priorityCount={6} endReached={loadMore} footer={<Footer />} />
        </TabsContent>
        <TabsContent value="movies" className="pt-4">
          {data.movies.length > 0 ? (
            <MediaGrid items={data.movies} priorityCount={6} endReached={loadMore} footer={<Footer />} />
          ) : (
            <p className="py-6 text-sm text-muted-foreground">No movies found.</p>
          )}
        </TabsContent>
        <TabsContent value="tv" className="pt-4">
          {data.tv.length > 0 ? (
            <MediaGrid items={data.tv} priorityCount={6} endReached={loadMore} footer={<Footer />} />
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              No TV shows found.
            </p>
          )}
        </TabsContent>
        <TabsContent value="anime" className="pt-4">
          {data.anime.length > 0 ? (
            <MediaGrid items={data.anime} priorityCount={6} endReached={loadMore} footer={<Footer />} />
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              No anime found.
            </p>
          )}
        </TabsContent>
        <TabsContent value="actors" className="pt-4">
          {data.actors.length > 0 ? (
            <MediaGrid items={data.actors} priorityCount={6} endReached={loadMore} footer={<Footer />} />
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              No actors found.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
