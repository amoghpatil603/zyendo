import type { Metadata } from "next";
import { Suspense } from "react";
import { Compass } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { isTmdbConfigured } from "@/lib/env";
import { DailyDiscovery } from "@/components/discover/daily-discovery";
import { ForYou } from "@/components/discover/for-you";
import { TrendingSection } from "@/components/discover/trending-section";
import { CommunityPicks } from "@/components/discover/community-picks";
import { EditorPicks } from "@/components/discover/editor-picks";
import { EditorialCollections } from "@/components/discover/editorial-collections";
import { HeroBanner } from "@/components/discover/hero-banner";
import { HiddenGems } from "@/components/discover/hidden-gems";
import { FriendActivity } from "@/components/discover/friend-activity";
import { ContinueExploring } from "@/components/discover/continue-exploring";
import { SmartSearch } from "@/components/discover/smart-search";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover",
  description: "Discover movies and TV shows — personalized recommendations, trending, community picks, and smart search.",
};

export default function DiscoverPage() {
  if (!isTmdbConfigured()) {
    return (
      <PageContainer className="space-y-8">
        <ConfigNotice
          service="TMDB"
          detail="Add a TMDB API key to discover movies and TV shows."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-10 pb-16">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Compass className="size-6 text-primary" />
          Discover
        </h1>
        <p className="text-sm text-muted-foreground">
          Personalized recommendations, trending, community picks, and smart search
        </p>
      </div>

      {/* Hero Banner (CMS) */}
      <HeroBanner />

      {/* Section 10: Daily Discovery */}
      <Suspense fallback={null}>
        <DailyDiscovery />
      </Suspense>

      {/* Section 1: For You */}
      <ForYou />

      {/* Section 2: Trending */}
      <TrendingSection />

      {/* Section 3: Community Picks */}
      <CommunityPicks />

      {/* Section 4: Editor's Picks (CMS Featured Content) */}
      <EditorPicks />

      {/* Section 5: Editorial Collections (CMS) */}
      <EditorialCollections />

      {/* Section 6: Hidden Gems */}
      <HiddenGems />

      {/* Section 7: Friend Activity */}
      <FriendActivity />

      {/* Section 8: Continue Exploring */}
      <ContinueExploring />

      {/* Section 9: Smart Search */}
      <SmartSearch />
    </PageContainer>
  );
}