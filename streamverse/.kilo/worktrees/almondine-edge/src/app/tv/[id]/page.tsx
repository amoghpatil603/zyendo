import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { MediaDetailView } from "@/components/media/media-detail-view";
import { TvSeasons } from "@/components/media/tv-seasons";
import { getTvDetail } from "@/lib/adapters/tmdb";
import { isTmdbConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { isInWatchlist } from "@/lib/watchlist";

async function loadTv(id: string) {
  if (!isTmdbConfigured()) return null;
  try {
    return await getTvDetail(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const show = await loadTv(id);
  if (!show) return { title: "TV Show" };
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
  const show = await loadTv(id);
  if (!show) notFound();

  const [user, inWatchlist] = await Promise.all([
    getCurrentUser(),
    isInWatchlist("tv", id),
  ]);

  return (
    <MediaDetailView
      detail={show}
      isAuthenticated={Boolean(user)}
      inWatchlist={inWatchlist}
    >
      {show.seasons && show.seasons.length > 0 ? (
        <TvSeasons tvId={id} seasons={show.seasons} />
      ) : null}
    </MediaDetailView>
  );
}
