import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { CommunityClient } from "@/components/community/community-client";
import { isSupabaseConfigured } from "@/lib/env";
import { getTrendingUsers, getPopularCollections } from "@/lib/social/social-actions";
import { getRecentReviewsAction } from "@/app/actions/reviews";
import { getSocialFeed } from "@/lib/social/social-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Community",
  description: "See what the Zynora community is watching, reviewing, and collecting.",
};

function CommunitySkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    </div>
  );
}

async function CommunityData() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const [trendingUsers, popularCollections, recentReviewsResult, recentActivity] = await Promise.all([
    getTrendingUsers(8),
    getPopularCollections(6),
    getRecentReviewsAction(),
    getSocialFeed(20),
  ]);

  const reviews = recentReviewsResult.ok ? recentReviewsResult.reviews.slice(0, 10) : [];
  const activities = recentActivity;

  return (
    <CommunityClient
      trendingUsers={trendingUsers}
      popularCollections={popularCollections}
      recentReviews={reviews}
      recentActivity={activities}
    />
  );
}

export default function CommunityPage() {
  return (
    <PageContainer className="space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Community</h1>
        <p className="text-sm text-muted-foreground">
          See what the Zynora community is watching, reviewing, and collecting
        </p>
      </div>

      <Suspense fallback={<CommunitySkeleton />}>
        <CommunityData />
      </Suspense>
    </PageContainer>
  );
}
