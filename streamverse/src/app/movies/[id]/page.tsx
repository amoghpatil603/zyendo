import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { MediaDetailView } from "@/components/media/media-detail-view";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { AddToCollectionButton } from "@/components/collections/add-to-collection-button";
import { getMovieDetail } from "@/lib/adapters/tmdb";
import { isTmdbConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { isInWatchlist } from "@/lib/watchlist";

import { normalizeExternalId } from "@/lib/adapters/registry";

async function loadMovie(id: string) {
  if (!isTmdbConfigured()) return null;
  try {
    return await getMovieDetail(normalizeExternalId(id));
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
  const movie = await loadMovie(id);
  if (!movie || "error" in movie) return { title: "Movie" };
  return {
    title: movie.title,
    description: movie.synopsis?.slice(0, 160),
  };
}

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [movie, user, inWatchlist] = await Promise.all([
    loadMovie(id),
    getCurrentUser(),
    isInWatchlist("movie", id),
  ]);

  if (movie === null) {
    notFound();
  }

  if (movie && "error" in movie) {
    return (
      <PageContainer className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center">
        <h1 className="text-xl font-semibold">We couldn&apos;t load this movie right now.</h1>
        <p className="text-muted-foreground text-sm">Please try again.</p>
        <a href="" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Try again
        </a>
      </PageContainer>
    );
  }

  return (
    <MediaDetailView
      detail={movie}
      isAuthenticated={Boolean(user)}
      inWatchlist={inWatchlist}
    >
      {/* Add to collection button and reviews section */}
      <div className="mt-8 space-y-8">
        <AddToCollectionButton mediaType="movie" mediaId={id} isAuthenticated={Boolean(user)} />
        <ReviewsSection mediaType="movie" mediaId={id} />
      </div>
    </MediaDetailView>
  );
}