import Link from "next/link";
import { LogIn, Sparkles, WandSparkles } from "lucide-react";
import type { Metadata } from "next";

import { getAiPicks } from "@/app/actions/ai-picks";
import { getTrendingAll, getUpcomingMovies } from "@/lib/adapters/tmdb";
import { getWatchHistory } from "@/lib/watch-history";
import { getWatchQueue } from "@/lib/watch-queue-data";
import { getCollectionsForUser } from "@/lib/collections";
import { getMyDna } from "@/app/actions/dna";
import { AiPicksDashboardClient } from "./picks-dashboard-client";
import { Button } from "@/components/ui/button";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { PageContainer } from "@/components/common/page-container";
import { isAIConfigured, isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMediaDetail } from "@/lib/adapters/registry";
import type { MediaItem } from "@/types/media-item";
import type { AiPick } from "@/types/ai-picks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI Picks", description: "Personalized recommendations shaped by your Entertainment DNA." };

async function hydrateItems(items: { mediaType: string; mediaId: string }[]): Promise<MediaItem[]> {
  if (items.length === 0) return [];
  const results = await Promise.allSettled(
    items.slice(0, 6).map((item) => getMediaDetail(item.mediaType, item.mediaId)),
  );
  const items_: MediaItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) items_.push(r.value);
  }
  return items_;
}

export default async function PicksPage() {
  if (!isSupabaseConfigured() || !isAIConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <Header />
        <ConfigNotice service="AI Picks" detail="Add Groq and Supabase configurations to unlock your daily recommendations." />
      </PageContainer>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageContainer className="space-y-6">
        <Header />
        <EmptyState icon={LogIn} title="Sign in for your AI Picks" description="We use your Entertainment DNA and saved preferences to find better things to watch." action={<Button asChild><Link href="/login?next=/picks">Sign in</Link></Button>} />
      </PageContainer>
    );
  }

  // Fetch all data concurrently
  const [aiPicksResult, trending, upcoming, dna, watchHistory, watchQueueItems, collections] = await Promise.all([
    getAiPicks(),
    getTrendingAll(1).catch(() => [] as MediaItem[]),
    getUpcomingMovies(1).catch(() => [] as MediaItem[]),
    getMyDna().catch(() => null),
    getWatchHistory({ limit: 6 }).catch(() => []),
    getWatchQueue().catch(() => []),
    getCollectionsForUser().catch(() => []),
  ]);

  // Hydrate watch history items into MediaItems
  const historyItems = await hydrateItems(
    watchHistory.map((h) => ({ mediaType: h.mediaType, mediaId: h.mediaId })),
  );

  // Hydrate watch queue items into MediaItems
  const queueItems = await hydrateItems(
    watchQueueItems.map((q) => ({ mediaType: q.mediaType, mediaId: q.tmdbId })),
  );

  // Get continue watching items (status === "watching")
  const continueWatchingIds = watchQueueItems.filter((q) => q.status === "watching").map((q) => ({ mediaType: q.mediaType, mediaId: q.tmdbId }));
  const continueWatchingItems = continueWatchingIds.length > 0 ? await hydrateItems(continueWatchingIds) : [];

  // Determine if AI picks are available
  const picksData: AiPick[] = aiPicksResult.ok ? aiPicksResult.recommendations : [];
  const generatedAt: string | null = aiPicksResult.ok ? aiPicksResult.generatedAt : null;

  return (
    <PageContainer className="space-y-8">
      <Header />

      <AiPicksDashboardClient
        picks={picksData}
        generatedAt={generatedAt}
        trending={trending.slice(0, 10)}
        upcomingMovies={upcoming.slice(0, 8)}
        watchHistoryItems={historyItems}
        watchQueueItems={queueItems}
        continueWatchingItems={continueWatchingItems}
        collections={collections.map((c) => ({ id: c.id, name: c.name, itemCount: c.itemCount }))}
        hasDna={dna !== null && dna.genreWeights.length > 0}
      />
    </PageContainer>
  );
}

function Header() {
  return (
    <header className="space-y-1">
      <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
        <Sparkles className="size-6 text-primary" />
        AI Picks
      </h1>
      <p className="text-sm text-muted-foreground">
        Your personalized recommendation dashboard — curated from your taste, watch history, and what's trending.
      </p>
    </header>
  );
}
