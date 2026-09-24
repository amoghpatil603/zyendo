import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import WatchQueueClient from "@/components/watch-queue/watch-queue-client";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";

import type { Metadata } from "next";
import { LogIn } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Watch Queue",
  description: "Your personal queue for movies and TV shows.",
};

export default async function WatchQueuePage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <Header />
        <ConfigNotice
          service="Supabase"
          detail="Add Supabase credentials to enable your watch queue, ratings, notes, and favorites."
        />
      </PageContainer>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageContainer className="space-y-6">
        <Header />
        <EmptyState
          icon={LogIn}
          title="Sign in to build your queue"
          description="Save movies and shows, track watching progress, and keep favorites in one place."
          action={
            <Button asChild>
              <a href="/login?next=/watch-queue">Sign in</a>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <Header />
      <WatchQueueClient />
    </PageContainer>
  );
}

function Header() {
  return (
    <header className="space-y-2">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold sm:text-3xl">Watch Queue</h1>
          <p className="text-sm text-muted-foreground">
            Track what you want to watch next—movies and TV, all in one cinematic dashboard.
          </p>
        </div>
      </div>
    </header>
  );
}

