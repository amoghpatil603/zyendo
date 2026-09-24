"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Review, ReviewRow, ReviewsStats } from "@/types/review";

export type ReviewActionResult =
  | { ok: true; review: Review }
  | { ok: false; error: "unauthenticated" | "unconfigured" | "failed" };

export type ReviewsListResult =
  | { ok: true; reviews: Review[]; stats: ReviewsStats }
  | { ok: false; error: "unconfigured" | "failed" | "unauthenticated" };

function mapReviewRow(row: ReviewRow): Review {
  return {
    id: row.id,
    userId: row.user_id,
    mediaType: row.media_type,
    mediaId: row.media_id,
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
  };
}

/** Public reviews for a title, plus aggregate stats. */
export async function getReviewsForMedia(
  mediaType: string,
  mediaId: string,
): Promise<ReviewsListResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("media_type", mediaType)
    .eq("media_id", mediaId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: "failed" };

  const rows = (data ?? []) as ReviewRow[];
  const reviews = rows.map(mapReviewRow);

  const stats: ReviewsStats = {
    reviewCount: reviews.length,
    averageRating:
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null,
  };

  return { ok: true, reviews, stats };
}

/** Current user's review for a title, if any. */
export async function getMyReview(
  mediaType: string,
  mediaId: string,
): Promise<Review | null> {
  if (!isSupabaseConfigured()) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", user.id)
    .eq("media_type", mediaType)
    .eq("media_id", mediaId)
    .maybeSingle();

  if (!data) return null;
  return mapReviewRow(data as ReviewRow);
}

/** Create or replace the current user's review. */
export async function upsertReview(
  mediaType: string,
  mediaId: string,
  rating: number,
  body: string,
): Promise<ReviewActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq("media_type", mediaType)
    .eq("media_id", mediaId)
    .maybeSingle();

  let reviewRow: ReviewRow;

  if (existing) {
    const { data, error } = await supabase
      .from("reviews")
      .update({ rating, body })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) return { ok: false, error: "failed" };
    reviewRow = data as ReviewRow;
  } else {
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: user.id,
        media_type: mediaType,
        media_id: mediaId,
        rating,
        body,
      })
      .select("*")
      .single();

    if (error || !data) return { ok: false, error: "failed" };
    reviewRow = data as ReviewRow;
  }

  revalidatePath("/");
  revalidatePath("/movies");
  revalidatePath("/tv");
  revalidatePath(`/movies/${mediaId}`);
  revalidatePath(`/tv/${mediaId}`);

  return { ok: true, review: mapReviewRow(reviewRow) };
}

/** Delete the current user's review for a title. */
export async function deleteReview(
  mediaType: string,
  mediaId: string,
): Promise<ReviewActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("user_id", user.id)
    .eq("media_type", mediaType)
    .eq("media_id", mediaId);

  if (error) return { ok: false, error: "failed" };

  revalidatePath("/");
  revalidatePath("/movies");
  revalidatePath("/tv");
  revalidatePath(`/movies/${mediaId}`);
  revalidatePath(`/tv/${mediaId}`);

  return { ok: true, review: {
    id: "",
    userId: user.id,
    mediaType,
    mediaId,
    rating: 0,
    body: "",
    createdAt: new Date().toISOString(),
  }};
}

/** Get all reviews by the current user. */
export async function getMyReviewsAction(): Promise<ReviewsListResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: "failed" };

  const rows = (data ?? []) as ReviewRow[];
  const reviews = rows.map(mapReviewRow);

  const stats: ReviewsStats = {
    reviewCount: reviews.length,
    averageRating:
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null,
  };

  return { ok: true, reviews, stats };
}

/** Get reviews liked by the current user. */
export async function getLikedReviewsAction(): Promise<ReviewsListResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("review_likes")
    .select("review_id, reviews(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: "failed" };

  const reviews = (data ?? [])
    .filter((item: any) => item.reviews)
    .map((item: any) => mapReviewRow(item.reviews as ReviewRow));

  const stats: ReviewsStats = {
    reviewCount: reviews.length,
    averageRating:
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null,
  };

  return { ok: true, reviews, stats };
}

/** Get recent reviews across the platform. */
export async function getRecentReviewsAction(): Promise<ReviewsListResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles:user_id(display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { ok: false, error: "failed" };

  const rows = (data ?? []) as any[];
  const reviews = rows.map((row) => ({
    ...mapReviewRow(row),
    userDisplayName: row.profiles?.display_name,
    userAvatarUrl: row.profiles?.avatar_url,
  }));

  const stats: ReviewsStats = {
    reviewCount: reviews.length,
    averageRating:
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null,
  };

  return { ok: true, reviews, stats };
}

/** Get top-rated reviews across the platform. */
export async function getTopReviewsAction(): Promise<ReviewsListResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("rating", { ascending: false })
    .limit(50);

  if (error) return { ok: false, error: "failed" };

  const rows = (data ?? []) as ReviewRow[];
  const reviews = rows.map(mapReviewRow);

  const stats: ReviewsStats = {
    reviewCount: reviews.length,
    averageRating:
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null,
  };

  return { ok: true, reviews, stats };
}

/** Delete a review by ID. */
export async function deleteReviewAction(input: {
  reviewId: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unconfigured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", input.reviewId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "failed" };

  revalidatePath("/");
  revalidatePath("/movies");
  revalidatePath("/tv");
  revalidatePath("/reviews");

  return { ok: true };
}