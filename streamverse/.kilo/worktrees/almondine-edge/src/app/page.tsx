import Link from "next/link";
import { Sparkles, Users, Dna, Compass } from "lucide-react";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { Reveal } from "@/components/common/reveal";
import { Hero } from "@/components/media/hero";
import { MediaRow } from "@/components/media/media-row";
import { Button } from "@/components/ui/button";
import { isTmdbConfigured } from "@/lib/env";
import { safeList } from "@/lib/safe";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWatchlistKeys } from "@/lib/watchlist";
import {
  getNowPlayingMovies,
  getPopularTv,
  getTopRatedMovies,
  getTrendingAll,
  getTrendingTv,
  getUpcomingMovies,
} from "@/lib/adapters/tmdb";

export const dynamic = "force-dynamic";

const PILLARS = [
  {
    icon: Sparkles,
    title: "AI recommendations",
    body: "Ask for exactly what you're in the mood for — grounded in real catalog data, never invented.",
  },
  {
    icon: Dna,
    title: "Entertainment DNA",
    body: "A living taste profile that makes every recommendation more you, the more you use it.",
  },
  {
    icon: Users,
    title: "Watch Together",
    body: "Settle 'what should we watch tonight' for the whole group in seconds.",
  },
  {
    icon: Compass,
    title: "Universal discovery",
    body: "One place to explore across movies and TV — with more verticals on the way.",
  },
];

export default async function HomePage() {
  if (!isTmdbConfigured()) {
    return (
      <PageContainer className="space-y-8">
        <WelcomePanel />
        <ConfigNotice
          service="TMDB"
          detail="Add TMDB_API_READ_ACCESS_TOKEN (or TMDB_API_KEY) to your environment to load trending titles, new releases and upcoming movies."
        />
      </PageContainer>
    );
  }

  const [trending, newReleases, upcoming, popularTv, topRatedMovies, trendingTv] =
    await Promise.all([
      safeList(() => getTrendingAll()),
      safeList(() => getNowPlayingMovies()),
      safeList(() => getUpcomingMovies()),
      safeList(() => getPopularTv()),
      safeList(() => getTopRatedMovies()),
      safeList(() => getTrendingTv()),
    ]);

  const featured =
    trending.find((item) => item.backdropImageUrl) ?? trending[0] ?? null;

  const user = await getCurrentUser();
  const watchlistKeys = await getWatchlistKeys();

  return (
    <PageContainer className="space-y-10">
      {featured ? (
        <Hero
          item={featured}
          isAuthenticated={Boolean(user)}
          inWatchlist={watchlistKeys.has(
            `${featured.type}:${featured.externalId}`,
          )}
        />
      ) : (
        <WelcomePanel />
      )}

      <Reveal>
        <MediaRow
          title="Trending this week"
          subtitle="What everyone's watching right now"
          items={trending.filter((i) => i.id !== featured?.id)}
        />
      </Reveal>
      <Reveal>
        <MediaRow
          title="New releases"
          subtitle="Fresh in theaters and just landed"
          items={newReleases}
          href="/movies?category=now_playing"
        />
      </Reveal>
      <Reveal>
        <MediaRow
          title="Trending TV"
          items={trendingTv}
          href="/tv?category=trending"
        />
      </Reveal>
      <Reveal>
        <MediaRow
          title="Top rated movies"
          items={topRatedMovies}
          href="/movies?category=top_rated"
        />
      </Reveal>
      <Reveal>
        <MediaRow
          title="Popular series"
          items={popularTv}
          href="/tv?category=popular"
        />
      </Reveal>
      <Reveal>
        <MediaRow
          title="Coming soon"
          subtitle="Upcoming releases to add to your watchlist"
          items={upcoming}
          href="/movies?category=upcoming"
        />
      </Reveal>
    </PageContainer>
  );
}

function WelcomePanel() {
  return (
    <section className="glass overflow-hidden rounded-3xl p-8 sm:p-12">
      <div className="max-w-2xl space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
          <Sparkles className="size-4" />
          Your entertainment decision assistant
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Decide what to watch,{" "}
          <span className="text-gradient">faster and more personally.</span>
        </h1>
        <p className="text-muted-foreground">
          StreamVerse helps you answer &quot;what should I watch right now&quot;
          better than a plain catalog — every watch link points to an official
          provider.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/movies">Explore movies</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/tv">Browse TV shows</Link>
          </Button>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.title}
              className="rounded-2xl border border-border/60 bg-card/50 p-4"
            >
              <Icon className="size-6 text-primary" />
              <h3 className="mt-3 font-semibold">{pillar.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{pillar.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
