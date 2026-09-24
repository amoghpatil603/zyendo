import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { MediaDetailView } from "@/components/media/media-detail-view";
import { getMovieDetail } from "@/lib/adapters/tmdb";
import { isTmdbConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { isInWatchlist } from "@/lib/watchlist";

async function loadMovie(id: string) {
  if (!isTmdbConfigured()) return null;
  try {
    return await getMovieDetail(id);
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
  const movie = await loadMovie(id);
  if (!movie) return { title: "Movie" };
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
  const movie = await loadMovie(id);
  if (!movie) notFound();

  const [user, inWatchlist] = await Promise.all([
    getCurrentUser(),
    isInWatchlist("movie", id),
  ]);

  return (
    <MediaDetailView
      detail={movie}
      isAuthenticated={Boolean(user)}
      inWatchlist={inWatchlist}
    />
  );
}
