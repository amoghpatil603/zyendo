"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { AdminRole } from "@/types/admin";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface AdminReview {
  id: string;
  userId: string;
  userName: string | null;
  userAvatarUrl: string | null;
  mediaType: string;
  mediaId: string;
  mediaTitle: string | null;
  rating: number;
  body: string;
  createdAt: string;
  isHidden: boolean;
  isFeatured: boolean;
  reportCount: number;
}

export interface AdminReviewDetail extends AdminReview {
  userEmail?: string;
  userReviewsCount: number;
  reports: AdminReviewReport[];
}

export interface AdminReviewReport {
  id: string;
  reporterId: string;
  reporterName: string | null;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface AdminReviewStats {
  totalReviews: number;
  reviewsToday: number;
  reportedReviews: number;
  hiddenReviews: number;
  averageRating: number;
  pendingReports: number;
}

// ---------------------------------------------------------------------------
// AUTHORIZATION
// ---------------------------------------------------------------------------

async function requireModerator(): Promise<{ userId: string; role: AdminRole } | null> {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("admin_roles").select("role").eq("user_id", user.id).maybeSingle();
  const role = data?.role as AdminRole | undefined;
  if (!role || (role !== "admin" && role !== "moderator")) return null;
  return { userId: user.id, role };
}

// ---------------------------------------------------------------------------
// STATS
// ---------------------------------------------------------------------------

export async function getAdminReviewStats(): Promise<AdminReviewStats> {
  const defaults: AdminReviewStats = {
    totalReviews: 0, reviewsToday: 0, reportedReviews: 0,
    hiddenReviews: 0, averageRating: 0, pendingReports: 0,
  };
  if (!isSupabaseConfigured()) return defaults;
  const supabase = await createSupabaseServerClient();

  try {
    const today = new Date().toISOString().slice(0, 10);
    const [total, todayCount, hidden, avgRating, pending] = await Promise.all([
      supabase.from("reviews").select("*", { count: "exact", head: true }),
      supabase.from("reviews").select("*", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("reviews").select("*", { count: "exact", head: true }).eq("is_hidden", true),
      supabase.from("reviews").select("rating"),
      supabase.from("review_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    // Count distinct reviews that have reports
    const { data: reportedData } = await supabase
      .from("review_reports")
      .select("review_id");

    const distinctReported = new Set((reportedData ?? []).map((r: { review_id: string }) => r.review_id)).size;

    let avg = 0;
    if (avgRating.data && avgRating.data.length > 0) {
      const ratings = avgRating.data as { rating: number }[];
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
      avg = Math.round((sum / ratings.length) * 10) / 10;
    }

    return {
      totalReviews: total.count ?? 0,
      reviewsToday: todayCount.count ?? 0,
      reportedReviews: distinctReported,
      hiddenReviews: hidden.count ?? 0,
      averageRating: avg,
      pendingReports: pending.count ?? 0,
    };
  } catch {
    return defaults;
  }
}

// ---------------------------------------------------------------------------
// LIST REVIEWS
// ---------------------------------------------------------------------------

export async function getAdminReviews(options: {
  query?: string;
  mediaType?: string;
  isHidden?: boolean;
  isReported?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ items: AdminReview[]; total: number; page: number; totalPages: number }> {
  const empty = { items: [] as AdminReview[], total: 0, page: 1, totalPages: 0 };
  if (!isSupabaseConfigured()) return empty;
  const supabase = await createSupabaseServerClient();

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 20));
  const query = options.query?.trim() ?? "";
  const mediaType = options.mediaType ?? "";
  const isHidden = options.isHidden;
  const isReported = options.isReported;
  const sort = options.sort ?? "newest";

  try {
    let baseQuery = supabase
      .from("reviews")
      .select("id, user_id, media_type, media_id, rating, body, created_at, is_hidden, is_featured", { count: "exact" });

    if (query) {
      baseQuery = baseQuery.or(`body.ilike.%${query}%,media_id.ilike.%${query}%`);
    }
    if (mediaType) {
      baseQuery = baseQuery.eq("media_type", mediaType);
    }
    if (isHidden !== undefined) {
      baseQuery = baseQuery.eq("is_hidden", isHidden);
    }

    switch (sort) {
      case "newest": baseQuery = baseQuery.order("created_at", { ascending: false }); break;
      case "oldest": baseQuery = baseQuery.order("created_at", { ascending: true }); break;
      case "highest_rated": baseQuery = baseQuery.order("rating", { ascending: false }); break;
      case "lowest_rated": baseQuery = baseQuery.order("rating", { ascending: true }); break;
      default: baseQuery = baseQuery.order("created_at", { ascending: false });
    }

    const { data: reviews, count, error } = await baseQuery.range(
      (page - 1) * pageSize,
      page * pageSize - 1,
    );

    if (error || !reviews) return empty;

    // Get user names and report counts
    const userIds = reviews.map((r) => r.user_id);
    const reviewIds = reviews.map((r) => r.id);

    const [profilesResp, reportsResp] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds),
      supabase.from("review_reports").select("review_id").in("review_id", reviewIds),
    ]);

    const nameMap = new Map((profilesResp.data ?? []).map((p) => [p.id, { name: p.display_name, avatar: p.avatar_url }]));
    const reportCountMap = new Map<string, number>();
    for (const r of reportsResp.data ?? []) {
      reportCountMap.set(r.review_id, (reportCountMap.get(r.review_id) ?? 0) + 1);
    }

    let items: AdminReview[] = reviews.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: nameMap.get(r.user_id)?.name ?? null,
      userAvatarUrl: nameMap.get(r.user_id)?.avatar ?? null,
      mediaType: r.media_type,
      mediaId: r.media_id,
      mediaTitle: null,
      rating: r.rating,
      body: r.body ?? "",
      createdAt: r.created_at,
      isHidden: r.is_hidden ?? false,
      isFeatured: r.is_featured ?? false,
      reportCount: reportCountMap.get(r.id) ?? 0,
    }));

    // Filter by reported status in-memory
    if (isReported) {
      items = items.filter((r) => r.reportCount > 0);
    }

    // Sort by report count in-memory
    if (sort === "most_reported") {
      items.sort((a, b) => b.reportCount - a.reportCount);
    }

    return {
      items,
      total: count ?? items.length,
      page,
      totalPages: Math.ceil((count ?? items.length) / pageSize),
    };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// GET SINGLE REVIEW DETAIL
// ---------------------------------------------------------------------------

export async function getAdminReviewDetail(reviewId: string): Promise<AdminReviewDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();

  try {
    const reviewResp = await supabase.from("reviews").select("*").eq("id", reviewId).maybeSingle();
    const review = reviewResp.data;
    if (!review) return null;

    // Get user info
    const [profileResp, reviewCountResp, reportsResp] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url").eq("id", review.user_id).maybeSingle(),
      supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", review.user_id),
      supabase.from("review_reports").select(`
        id, reporter_id, reason, description, status, created_at,
        reporter:profiles!review_reports_reporter_id_fkey(display_name)
      `).eq("review_id", reviewId).order("created_at", { ascending: false }),
    ]);

    const reports: AdminReviewReport[] = ((reportsResp.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      reporterId: r.reporter_id as string,
      reporterName: ((r.reporter as Record<string, unknown> | null)?.display_name as string) ?? null,
      reason: r.reason as string,
      description: (r.description as string) ?? null,
      status: r.status as string,
      createdAt: r.created_at as string,
    }));

    const profile = profileResp.data;

    return {
      id: review.id,
      userId: review.user_id,
      userName: profile?.display_name ?? null,
      userAvatarUrl: profile?.avatar_url ?? null,
      mediaType: review.media_type,
      mediaId: review.media_id,
      mediaTitle: null,
      rating: review.rating,
      body: review.body ?? "",
      createdAt: review.created_at,
      isHidden: review.is_hidden ?? false,
      isFeatured: review.is_featured ?? false,
      reportCount: reports.length,
      userEmail: undefined,
      userReviewsCount: reviewCountResp.count ?? 0,
      reports,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// MODERATION ACTIONS
// ---------------------------------------------------------------------------

async function logModAction(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  adminId: string, action: string, reviewId: string, details?: Record<string, unknown>,
) {
  try {
    await supabase.from("admin_audit_log").insert({
      admin_user_id: adminId, action, target_type: "review",
      target_id: reviewId, details: details ?? null,
    });
  } catch (e) {
    console.error("Failed to log moderation action:", e);
  }
}

export async function hideReview(reviewId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator();
  if (!admin) return { ok: false, error: "Unauthorized." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase.from("reviews").update({ is_hidden: true }).eq("id", reviewId);
    if (error) return { ok: false, error: error.message };
    await logModAction(supabase, admin.userId, "hide_review", reviewId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to hide review." };
  }
}

export async function unhideReview(reviewId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator();
  if (!admin) return { ok: false, error: "Unauthorized." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase.from("reviews").update({ is_hidden: false }).eq("id", reviewId);
    if (error) return { ok: false, error: error.message };
    await logModAction(supabase, admin.userId, "unhide_review", reviewId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to unhide review." };
  }
}

export async function featureReview(reviewId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator();
  if (!admin) return { ok: false, error: "Unauthorized." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase.from("reviews").update({ is_featured: true }).eq("id", reviewId);
    if (error) return { ok: false, error: error.message };
    await logModAction(supabase, admin.userId, "feature_review", reviewId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to feature review." };
  }
}

export async function deleteReview(reviewId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator();
  if (!admin) return { ok: false, error: "Unauthorized." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) return { ok: false, error: error.message };
    await logModAction(supabase, admin.userId, "delete_review", reviewId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete review." };
  }
}

export async function resolveReport(reportId: string, resolution: "resolved" | "dismissed"): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator();
  if (!admin) return { ok: false, error: "Unauthorized." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase
      .from("review_reports")
      .update({ status: resolution, resolved_at: new Date().toISOString(), resolved_by: admin.userId })
      .eq("id", reportId);
    if (error) return { ok: false, error: error.message };
    await logModAction(supabase, admin.userId, `${resolution}_report`, reportId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to resolve report." };
  }
}
