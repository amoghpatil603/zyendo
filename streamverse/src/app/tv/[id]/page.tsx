import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { MediaDetailView } from "@/components/media/media-detail-view";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { AddToCollectionButton } from "@/components/collections/add-to-collection-button";
import { TvSeasons } from "@/components/media/tv-seasons";
import { getTvDetail } from "@/lib/adapters/tmdb";
import { isTmdbConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { isInWatchlist } from "@/lib/watchlist";

import { normalizeExternalId } from "@/lib/adapters/registry";

async function loadTv(id: string) {
  if (!isTmdbConfigured()) return null;
  try {
    return await getTvDetail(normalizeExternalId(id));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("HTTP 404")) {
      return null;
    }
    return { error: "transient", message: msg };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const show = await loadTv(id);
  if (!show || "error" in show) return { title: "TV Show" };
  return {
    title: show.title,
    description: show.synopsis?.slice(0, 160),
  };
}

export default async function TvDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [show, user, inWatchlist] = await Promise.all([
    loadTv(id),
    getCurrentUser(),
    isInWatchlist("tv", id),
  ]);

  if (show === null) {
    notFound();
  }

  if (show && "error" in show) {
    return (
      <PageContainer className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center">
        <h1 className="text-xl font-semibold">We couldn&apos;t load this show right now.</h1>
        <p className="text-muted-foreground text-sm">Please try again.</p>
        <a href="" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Try again
        </a>
      </PageContainer>
    );
  }

  return (
    <MediaDetailView
      detail={show}
      isAuthenticated={Boolean(user)}
      inWatchlist={inWatchlist}
    >
      <div className="mt-8 space-y-8">
        <AddToCollectionButton mediaType="tv" mediaId={id} isAuthenticated={Boolean(user)} />
        <ReviewsSection mediaType="tv" mediaId={id} />
        {show.seasons && show.seasons.length > 0 ? (
          <TvSeasons tvId={id} seasons={show.seasons} />
        ) : null}
      </div>
    </MediaDetailView>
  );
}
