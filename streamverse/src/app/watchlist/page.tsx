import Link from "next/link";
import { Bookmark, LogIn, Plus } from "lucide-react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { RemovableMediaCard } from "@/components/media/removable-media-card";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWatchlistItems } from "@/lib/watchlist";
import { getCollectionsForUser } from "@/lib/collections";
import { CollectionGrid } from "@/components/collections/collection-grid";
import { CollectionForm } from "@/components/collections/collection-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My World",
  description: "Your saved watchlist and collections.",
};

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "watchlist" } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <Header activeTab={tab} />
        <ConfigNotice
          service="Supabase"
          detail="Add Supabase credentials to enable accounts, a saved watchlist, and custom collections."
        />
      </PageContainer>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageContainer className="space-y-6">
        <Header activeTab={tab} />
        <EmptyState
          icon={LogIn}
          title="Sign in to see your world"
          description="Save movies and shows, and organize them into collections."
          action={
            <Button asChild>
              <Link href="/login?next=/watchlist">Sign in</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (tab === "collections") {
    const collections = await getCollectionsForUser();
    return (
      <PageContainer className="space-y-6">
        <Header activeTab={tab} count={collections.length} />
        
        <div className="mb-6 flex justify-end">
           {/* Temporary simplified CollectionForm container. We render it conditionally in a client wrapper in a real app, 
               but for now we'll just put it here since it's a client component that manages its own state if we want.
               Wait, CollectionForm needs a modal wrapper to not take up space. Let's create a small client wrapper.
               Actually, I'll just render the grid and add an "add" button that navigates to a new page or we can use a native dialog.
               Let's use a native HTML details/summary as a lightweight accordion for the form. */}
           <details className="group rounded-xl border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
                 <Plus className="size-4" />
                 New Collection
              </summary>
              <div className="border-t border-border p-4">
                 <CollectionForm />
              </div>
           </details>
        </div>

        {collections.length > 0 ? (
          <CollectionGrid collections={collections} />
        ) : (
          <EmptyState
             icon={Bookmark}
             title="No collections yet"
             description="Create a collection to organize your favorite movies and shows."
          />
        )}
      </PageContainer>
    );
  }

  // Watchlist tab
  const items = await getWatchlistItems();

  return (
    <PageContainer className="space-y-6">
      <Header activeTab={tab} count={items.length} />
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

function Header({ activeTab, count }: { activeTab: string; count?: number }) {
  return (
    <header className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">My World</h1>
        <p className="text-sm text-muted-foreground">
          {activeTab === "watchlist"
            ? count !== undefined && count > 0
              ? `${count} saved ${count === 1 ? "title" : "titles"} in your watchlist`
              : "Your personal watchlist of movies and shows"
            : count !== undefined && count > 0
              ? `${count} ${count === 1 ? "collection" : "collections"} created`
              : "Organize your favorite movies and shows into custom collections"}
        </p>
      </div>

      <div className="flex items-center gap-4 border-b border-border text-sm font-medium">
        <Link
          href="/watchlist?tab=watchlist"
          className={`pb-3 border-b-2 transition-colors hover:text-foreground ${
            activeTab === "watchlist"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Watchlist
        </Link>
        <Link
          href="/watchlist?tab=collections"
          className={`pb-3 border-b-2 transition-colors hover:text-foreground ${
            activeTab === "collections"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Collections
        </Link>
      </div>
    </header>
  );
}
