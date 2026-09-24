import { Search as SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { SearchBar } from "@/components/layout/search-bar";
import { isTmdbConfigured } from "@/lib/env";
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
        <Suspense fallback={<div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Searching Zynora...</div>}>
          <SearchResults query={query} />
        </Suspense>
      )}
    </PageContainer>
  );
}

import { InfiniteSearchResults } from "@/components/search/infinite-search-results";

async function SearchResults({ query }: { query: string }) {
  let results;
  try {
    results = await searchMulti(query);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Initial search failed:", msg);
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center">
        <h1 className="text-xl font-semibold">Unable to load results.</h1>
        <p className="text-muted-foreground text-sm">Please try again.</p>
        <a
          href=""
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </a>
      </div>
    );
  }

  return <InfiniteSearchResults key={query} query={query} initialData={results} />;
}
