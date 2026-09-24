import { Tv } from "lucide-react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { MediaGrid } from "@/components/media/media-grid";
import {
  BrowseFilters,
  type CategoryOption,
} from "@/components/media/browse-filters";
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

const CATEGORIES: CategoryOption[] = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top Rated" },
  { value: "airing_today", label: "Airing Today" },
  { value: "on_the_air", label: "On The Air" },
];

function fetchByCategory(category: string): Promise<MediaItem[]> {
  switch (category) {
    case "popular":
      return getPopularTv();
    case "top_rated":
      return getTopRatedTv();
    case "airing_today":
      return getAiringTodayTv();
    case "on_the_air":
      return getOnTheAirTv();
    case "trending":
    default:
      return getTrendingTv();
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
  const items =
    genreId && !Number.isNaN(genreId)
      ? await safeList(() => getTvByGenre(genreId))
      : await safeList(() => fetchByCategory(category));

  const activeGenreName = genres.find((g) => g.id === genreId)?.name;

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

      {items.length > 0 ? (
        <MediaGrid items={items} priorityCount={6} />
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
