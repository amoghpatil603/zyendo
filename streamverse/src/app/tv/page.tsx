import { Tv } from "lucide-react";
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
  getAiringTodayTv,
  getOnTheAirTv,
  getPopularTv,
  getTopRatedTv,
  getTrendingTv,
  getTvByGenre,
  listTvGenres,
} from "@/lib/adapters/tmdb";
import type { MediaItem } from "@/types/media-item";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TV Shows",
  description: "Discover trending, popular and airing-today TV shows.",
};

// URL category values (used in query params)
const CATEGORIES: CategoryOption[] = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top Rated" },
  { value: "airing_today", label: "Airing Today" },
  { value: "on_the_air", label: "On The Air" },
];

// Map URL category to server action category
function toActionCategory(urlCategory: string): string {
  const mapping: Record<string, string> = {
    trending: "trending_tv",
    popular: "popular_tv",
    top_rated: "top_rated_tv",
    airing_today: "airing_today",
    on_the_air: "on_the_air",
  };
  return mapping[urlCategory] || "trending_tv";
}

function getCategoryFn(category: string): (page: number) => Promise<MediaItem[]> {
  switch (category) {
    case "popular":
      return getPopularTv;
    case "top_rated":
      return getTopRatedTv;
    case "airing_today":
      return getAiringTodayTv;
    case "on_the_air":
      return getOnTheAirTv;
    case "trending":
    default:
      return getTrendingTv;
  }
}

export default async function TvPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; genre?: string }>;
}) {
  const { category = "trending", genre } = await searchParams;
  const genreId = genre ? Number(genre) : undefined;

  if (!isTmdbConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <h1 className="text-2xl font-bold sm:text-3xl">TV Shows</h1>
        <ConfigNotice
          service="TMDB"
          detail="Add a TMDB API key to browse TV shows."
        />
      </PageContainer>
    );
  }

  const genres = await safeList(() => listTvGenres());
  const initialItems =
    genreId && !Number.isNaN(genreId)
      ? await safeList(() => getTvByGenre(genreId, 1))
      : await safeList(() => getCategoryFn(category)(1));

  const activeGenreName = genres.find((g) => g.id === genreId)?.name;

  // Map category to server action identifier
  const categoryKey = genreId && !Number.isNaN(genreId)
    ? `tv_by_genre` // Special handling in fetchMediaByCategory
    : toActionCategory(category);

  return (
    <PageContainer className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">TV Shows</h1>
        <p className="text-sm text-muted-foreground">
          {activeGenreName
            ? `Browsing ${activeGenreName} series`
            : "Trending, popular and currently-airing series"}
        </p>
      </header>

      <BrowseFilters
        basePath="/tv"
        categories={CATEGORIES}
        activeCategory={category}
        genres={genres}
        activeGenre={genreId && !Number.isNaN(genreId) ? genreId : undefined}
      />

      {initialItems.length > 0 ? (
        <InfiniteMediaGrid
          items={initialItems}
          category={categoryKey}
          genreId={genreId && !Number.isNaN(genreId) ? genreId : undefined}
          priorityCount={6}
        />
      ) : (
        <EmptyState
          icon={Tv}
          title="No shows found"
          description="Try a different category or genre."
        />
      )}
    </PageContainer>
  );
}