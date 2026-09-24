import { Clapperboard } from "lucide-react";
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
  getMoviesByGenre,
  getNowPlayingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getTrendingMovies,
  getUpcomingMovies,
  listMovieGenres,
} from "@/lib/adapters/tmdb";
import type { MediaItem } from "@/types/media-item";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Movies",
  description: "Discover popular, trending, top-rated and upcoming movies.",
};

const CATEGORIES: CategoryOption[] = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top Rated" },
  { value: "upcoming", label: "Upcoming" },
  { value: "now_playing", label: "Now Playing" },
];

function fetchByCategory(category: string): Promise<MediaItem[]> {
  switch (category) {
    case "popular":
      return getPopularMovies();
    case "top_rated":
      return getTopRatedMovies();
    case "upcoming":
      return getUpcomingMovies();
    case "now_playing":
      return getNowPlayingMovies();
    case "trending":
    default:
      return getTrendingMovies();
  }
}

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; genre?: string }>;
}) {
  const { category = "trending", genre } = await searchParams;
  const genreId = genre ? Number(genre) : undefined;

  if (!isTmdbConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Movies</h1>
        <ConfigNotice
          service="TMDB"
          detail="Add a TMDB API key to browse movies."
        />
      </PageContainer>
    );
  }

  const genres = await safeList(() => listMovieGenres());
  const items =
    genreId && !Number.isNaN(genreId)
      ? await safeList(() => getMoviesByGenre(genreId))
      : await safeList(() => fetchByCategory(category));

  const activeGenreName = genres.find((g) => g.id === genreId)?.name;

  return (
    <PageContainer className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Movies</h1>
        <p className="text-sm text-muted-foreground">
          {activeGenreName
            ? `Browsing ${activeGenreName} movies`
            : "Popular, trending, top-rated and upcoming films"}
        </p>
      </header>

      <BrowseFilters
        basePath="/movies"
        categories={CATEGORIES}
        activeCategory={category}
        genres={genres}
        activeGenre={genreId && !Number.isNaN(genreId) ? genreId : undefined}
      />

      {items.length > 0 ? (
        <MediaGrid items={items} priorityCount={6} />
      ) : (
        <EmptyState
          icon={Clapperboard}
          title="No movies found"
          description="Try a different category or genre."
        />
      )}
    </PageContainer>
  );
}
