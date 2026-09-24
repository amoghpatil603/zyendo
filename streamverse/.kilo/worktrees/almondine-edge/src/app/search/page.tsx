import { SearchX, Search as SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { MediaGrid } from "@/components/media/media-grid";
import { SearchBar } from "@/components/layout/search-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isTmdbConfigured } from "@/lib/env";
import { safe } from "@/lib/safe";
import { searchMulti } from "@/lib/adapters/tmdb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search across movies and TV shows.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  return (
    <PageContainer className="space-y-6">
      <header className="space-y-4">
        <h1 className="text-2xl font-bold sm:text-3xl">Search</h1>
        <Suspense fallback={null}>
          <SearchBar className="max-w-xl" autoFocus />
        </Suspense>
      </header>

      {!isTmdbConfigured() ? (
        <ConfigNotice
          service="TMDB"
          detail="Add a TMDB API key to search movies and TV shows."
        />
      ) : !query ? (
        <EmptyState
          icon={SearchIcon}
          title="Search movies & TV"
          description="Find a film, series, or something new to watch. Try a title, genre, or actor."
        />
      ) : (
        <SearchResults query={query} />
      )}
    </PageContainer>
  );
}

async function SearchResults({ query }: { query: string }) {
  const results = await safe(() => searchMulti(query), {
    movies: [],
    tv: [],
    all: [],
    totalResults: 0,
  });

  if (results.all.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={`No results for "${query}"`}
        description="Check your spelling or try a different title."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {results.totalResults.toLocaleString()} results for{" "}
        <span className="font-medium text-foreground">&quot;{query}&quot;</span>
      </p>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({results.all.length})</TabsTrigger>
          <TabsTrigger value="movies">
            Movies ({results.movies.length})
          </TabsTrigger>
          <TabsTrigger value="tv">TV ({results.tv.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="pt-4">
          <MediaGrid items={results.all} priorityCount={6} />
        </TabsContent>
        <TabsContent value="movies" className="pt-4">
          {results.movies.length > 0 ? (
            <MediaGrid items={results.movies} priorityCount={6} />
          ) : (
            <p className="py-6 text-sm text-muted-foreground">No movies found.</p>
          )}
        </TabsContent>
        <TabsContent value="tv" className="pt-4">
          {results.tv.length > 0 ? (
            <MediaGrid items={results.tv} priorityCount={6} />
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              No TV shows found.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
