import Link from "next/link";
import { Bookmark, LogIn } from "lucide-react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { RemovableMediaCard } from "@/components/media/removable-media-card";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWatchlistItems } from "@/lib/watchlist";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My World",
  description: "Your saved watchlist.",
};

export default async function WatchlistPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <Header />
        <ConfigNotice
          service="Supabase"
          detail="Add Supabase credentials to enable accounts and a saved watchlist."
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
          title="Sign in to see your watchlist"
          description="Save movies and shows to watch later and get personalized recommendations."
          action={
            <Button asChild>
              <Link href="/login?next=/watchlist">Sign in</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const items = await getWatchlistItems();

  return (
    <PageContainer className="space-y-6">
      <Header count={items.length} />
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <RemovableMediaCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Your watchlist is empty"
          description="Browse movies and shows and tap the bookmark to save them here."
          action={
            <Button asChild>
              <Link href="/movies">Explore movies</Link>
            </Button>
          }
        />
      )}
    </PageContainer>
  );
}

function Header({ count }: { count?: number }) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-bold sm:text-3xl">My World</h1>
      <p className="text-sm text-muted-foreground">
        {count !== undefined && count > 0
          ? `${count} saved ${count === 1 ? "title" : "titles"} in your watchlist`
          : "Your personal watchlist of movies and shows"}
      </p>
    </header>
  );
}
