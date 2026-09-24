import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { Reveal } from "@/components/common/reveal";
import { Hero } from "@/components/media/hero";
import { MediaRow } from "@/components/media/media-row";
import { Skeleton } from "@/components/ui/skeleton";
import { isTmdbConfigured } from "@/lib/env";
import { safeList } from "@/lib/safe";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWatchlistKeys } from "@/lib/watchlist";
import { getWatchHistory } from "@/lib/watch-history";
import {
  getTrendingAll,
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getTrendingTv,
  getPopularTv,
  getTopRatedTv,
  getAnimeTrending,
  getUpcomingMovies,
  getAiringTodayTv,
  getOnTheAirTv,
} from "@/lib/adapters/tmdb";
import { getAiPicks } from "@/app/actions/ai-picks";
import type { MediaItem } from "@/types/media-item";
import { InfiniteHomeSection } from "@/components/home/infinite-home-section";

export const dynamic = "force-dynamic";

function deduplicateItems(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  const result: MediaItem[] = [];
  for (const item of items) {
    const key = `${item.type}:${item.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export default async function HomePage() {
  if (!isTmdbConfigured()) {
    return (
      <PageContainer className="space-y-8">
        <ConfigNotice
          service="TMDB"
          detail="Add TMDB_API_READ_ACCESS_TOKEN (or TMDB_API_KEY) to your environment to load trending titles, new releases and upcoming movies."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-10 pb-16">
      <Suspense fallback={<HeroSkeleton />}>
        <TrendingHeroSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <TrendingMoviesSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <PopularMoviesSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <NowPlayingMoviesSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <UpcomingMoviesSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <TrendingTvSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <PopularTvSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <TopRatedTvSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <AiringTodayTvSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <OnTheAirTvSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <AnimeSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <ContinueWatchingSection />
      </Suspense>

      <Suspense fallback={<RowSkeleton />}>
        <RecommendedForYouSection />
      </Suspense>
    </PageContainer>
  );
}

function HeroSkeleton() {
  return <Skeleton className="h-[60vh] min-h-[400px] w-full rounded-3xl sm:h-[70vh] md:h-[75vh]" />;
}

function RowSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0 rounded-xl sm:w-44 md:w-52" />
        ))}
      </div>
    </div>
  );
}

async function TrendingHeroSection() {
  const [trending, user, watchlistKeys] = await Promise.all([
    safeList(() => getTrendingAll(1)),
    getCurrentUser(),
    getWatchlistKeys(),
  ]);

  const valid = trending.filter((item) => item.backdropImageUrl);
  if (valid.length === 0) return null;

  const featured = [...valid].sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))[0]!;

  return (
    <Hero
      item={featured}
      isAuthenticated={Boolean(user)}
      inWatchlist={watchlistKeys.has(`${featured.type}:${featured.externalId}`)}
      candidates={valid}
    />
  );
}

async function TrendingMoviesSection() {
  const initialItems = await safeList(() => getTrendingMovies(1));
  const unique = deduplicateItems(initialItems);
  if (!unique.length) return null;

  return (
    <Reveal>
      <InfiniteHomeSection
        title="Trending Movies"
        subtitle="The most watched films this week"
        initialItems={unique}
        category="trending_movies"
        href="/movies?category=trending"
      />
    </Reveal>
  );
}

async function PopularMoviesSection() {
  const initialItems = await safeList(() => getPopularMovies(1));
  const unique = deduplicateItems(initialItems);
  if (!unique.length) return null;

  return (
    <Reveal>
      <InfiniteHomeSection
        title="Popular Movies"
        subtitle="Current fan favorites"
        initialItems={unique}
        category="popular_movies"
        href="/movies?category=popular"
      />
    </Reveal>
  );
}

async function TopRatedMoviesSection() {
  const initialItems = await safeList(() => getTopRatedMovies(1));
  const unique = deduplicateItems(initialItems);
  if (!unique.length) return null;

  return (
    <Reveal>
      <InfiniteHomeSection
        title="Top Rated Movies"
        subtitle="Critically acclaimed masterpieces"
        initialItems={unique}
        category="top_rated_movies"
        href="/movies?category=top_rated"
      />
    </Reveal>
  );
}

async function NowPlayingMoviesSection() {
  const initialItems = await safeList(() => getNowPlayingMovies(1));
  const unique = deduplicateItems(initialItems);
  if (!unique.length) return null;

  return (
    <Reveal>
      <InfiniteHomeSection
        title="Now Playing Movies"
        subtitle="Fresh in theaters"
        initialItems={unique}
        category="now_playing"
        href="/movies?category=now_playing"
      />
    </Reveal>
  );
}

async function UpcomingMoviesSection() {
  const initialItems = await safeList(() => getUpcomingMovies(1));
  const unique = deduplicateItems(initialItems);
  if (!unique.length) return null;

  return (
    <Reveal>
      <InfiniteHomeSection
        title="Upcoming Movies"
        subtitle="Coming soon to theaters"
        initialItems={unique}
        category="upcoming_movies"
        href="/movies?category=upcoming"
      />
    </Reveal>
  );
}

async function TrendingTvSection() {
  const initialItems = await safeList(() => getTrendingTv(1));
  const unique = deduplicateItems(initialItems);
  if (!unique.length) return null;

  return (
    <Reveal>
      <InfiniteHomeSection
        title="Trending TV Shows"
        subtitle="Most watched shows this week"
        initialItems={unique}
        category="trending_tv"
        href="/tv?category=trending"
      />
    </Reveal>
  );
}

async function PopularTvSection() {
  const initialItems = await safeList(() => getPopularTv(1));
  const unique = deduplicateItems(initialItems);
  if (!unique.length) return null;

  return (
    <Reveal>
      <InfiniteHomeSection
        title="Popular TV Shows"
        subtitle="Highly watched television series"
        initialItems={unique}
        category="popular_tv"
        href="/tv?category=popular"
      />
    </Reveal>
  );
}

async function TopRatedTvSection() {
  const initialItems = await safeList(() => getTopRatedTv(1));
  const unique = deduplicateItems(initialItems);
  if (!unique.length) return null;

  return (
    <Reveal>
      <InfiniteHomeSection
        title="Top Rated TV Shows"
        subtitle="Highest rated television series"
        initialItems={unique}
        category="top_rated_tv"
        href="/tv?category=top_rated"
      />
    </Reveal>
  );
}

async function AnimeSection() {
  const initialItems = await safeList(() => getAnimeTrending(1));
  const unique = deduplicateItems(initialItems);
  if (!unique.length) return null;

  return (
    <Reveal>
      <InfiniteHomeSection
        title="Anime"
        subtitle="Trending Japanese animations"
        initialItems={unique}
        category="trending_anime"
        href="/anime"
      />
    </Reveal>
  );
}

async function AiringTodayTvSection() {
  const initialItems = await safeList(() => getAiringTodayTv(1));
  const unique = deduplicateItems(initialItems);
  if (!unique.length) return null;

  return (
    <Reveal>
      <InfiniteHomeSection
        title="Airing Today"
        subtitle="TV Shows airing new episodes today"
        initialItems={unique}
        category="airing_today"
        href="/tv?category=airing_today"
      />
    </Reveal>
  );
}

async function OnTheAirTvSection() {
  const initialItems = await safeList(() => getOnTheAirTv(1));
  const unique = deduplicateItems(initialItems);
  if (!unique.length) return null;

  return (
    <Reveal>
      <InfiniteHomeSection
        title="On The Air"
        subtitle="TV Shows currently airing"
        initialItems={unique}
        category="on_the_air"
        href="/tv?category=on_the_air"
      />
    </Reveal>
  );
}

async function ContinueWatchingSection() {
  const history = await safeList(() => getWatchHistory({ limit: 50 }));
  if (!history.length) return null;

  const items: MediaItem[] = history.map((entry) => ({
    id: `${entry.mediaType}-${entry.mediaId}`,
    type: entry.mediaType as MediaItem["type"],
    title: entry.title,
    coverImageUrl: entry.coverImageUrl ?? null,
    backdropImageUrl: null,
    synopsis: "",
    source: "tmdb",
    externalId: entry.mediaId,
    genres: [],
    people: [],
  }));
  const unique = deduplicateItems(items);
  if (!unique.length) return null;

  return (
    <Reveal>
      <MediaRow title="Continue Watching" subtitle="Pick up where you left off" items={unique} />
    </Reveal>
  );
}

async function RecommendedForYouSection() {
  const picks = await getAiPicks();
  let items: MediaItem[] = [];
  if (picks.ok && picks.recommendations.length > 0) {
    items = picks.recommendations.map((r) => r.media);
  } else {
    items = await safeList(() => getTrendingAll(3));
  }

  const unique = deduplicateItems(items);
  if (!unique.length) return null;

  const subtitle = picks.ok && picks.recommendations.length > 0
    ? "Personalized picks based on your taste"
    : "Popular titles to explore";

  return (
    <Reveal>
      <InfiniteHomeSection
        title="Recommended For You"
        subtitle={subtitle}
        initialItems={unique}
        category="trending_all"
      />
    </Reveal>
  );
}