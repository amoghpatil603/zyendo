import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import {
  BrowseFilters,
  type CategoryOption,
} from "@/components/media/browse-filters";
import { InfiniteMediaGrid } from "@/components/media/infinite-media-grid";
import { isTmdbConfigured } from "@/lib/env";
import { safeList } from "@/lib/safe";
import {
  getAnimeAiring,
  getAnimeMovies,
  getAnimePopular,
  getAnimeTopRated,
  getAnimeTrending,
  getAnimeUpcoming,
} from "@/lib/adapters/tmdb";
import type { MediaItem } from "@/types/media-item";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anime",
  description: "Discover trending, popular, and airing anime.",
};

// URL category values (used in query params)
const CATEGORIES: CategoryOption[] = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top Rated" },
  { value: "airing", label: "Airing" },
  { value: "upcoming", label: "Upcoming" },
  { value: "movies", label: "Movies" },
];

// Map URL category to server action category
function toActionCategory(urlCategory: string): string {
  const mapping: Record<string, string> = {
    trending: "trending_anime",
    popular: "popular_anime",
    top_rated: "top_rated_anime",
    airing: "airing_anime",
    upcoming: "upcoming_anime",
    movies: "movies_anime",
  };
  return mapping[urlCategory] || "trending_anime";
}

function getCategoryFn(category: string): (page: number) => Promise<MediaItem[]> {
  switch (category) {
    case "popular":
      return getAnimePopular;
    case "top_rated":
      return getAnimeTopRated;
    case "airing":
      return getAnimeAiring;
    case "upcoming":
      return getAnimeUpcoming;
    case "movies":
      return getAnimeMovies;
    case "trending":
    default:
      return getAnimeTrending;
  }
}

export default async function AnimePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category = "trending" } = await searchParams;

  if (!isTmdbConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Anime</h1>
        <ConfigNotice
          service="TMDB"
          detail="Add a TMDB API key to browse anime."
        />
      </PageContainer>
    );
  }

  const initialItems = await safeList(() => getCategoryFn(category)(1));
  const categoryKey = toActionCategory(category);

  return (
    <PageContainer className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Anime</h1>
        <p className="text-sm text-muted-foreground">
          Trending, popular and airing anime series and movies
        </p>
      </header>

      <BrowseFilters
        basePath="/anime"
        categories={CATEGORIES}
        activeCategory={category}
        genres={[]}
      />

      {initialItems.length > 0 ? (
        <InfiniteMediaGrid
          items={initialItems}
          category={categoryKey}
          priorityCount={6}
        />
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No anime found"
          description="Try a different category."
        />
      )}
    </PageContainer>
  );
}