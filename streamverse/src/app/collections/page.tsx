import { Suspense } from "react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { CollectionsClient } from "@/components/collections/collections-client";
import { LogIn, Library } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collections",
  description: "Your custom collections — organize movies, TV, and anime your way.",
};

export default async function CollectionsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <ConfigNotice
          service="Supabase"
          detail="Add Supabase credentials to create and manage collections."
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
          title="Sign in to manage collections"
          description="Create custom lists for movies, TV shows, and anime."
          action={
            <Button asChild>
              <a href="/login?next=/collections">Sign in</a>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-8 pb-16">
      <Suspense fallback={<CollectionsSkeleton />}>
        <CollectionsClient />
      </Suspense>
    </PageContainer>
  );
}

function CollectionsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}