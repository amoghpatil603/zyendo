import { Suspense } from "react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/profile/dashboard-client";
import { LogIn, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "Your personal Zynora dashboard — track everything you watch.",
};

export default async function ProfilePage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <ConfigNotice
          service="Supabase"
          detail="Add Supabase credentials to enable your personal dashboard."
        />
      </PageContainer>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageContainer className="space-y-6">
        <EmptyState
          icon={LogIn}
          title="Sign in to see your dashboard"
          description="Track your watch history, earn achievements, set goals, and more."
          action={
            <Button asChild>
              <a href="/login?next=/profile">Sign in</a>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-8 pb-16">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardClient />
      </Suspense>
    </PageContainer>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      {/* Two column layout skeleton */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}