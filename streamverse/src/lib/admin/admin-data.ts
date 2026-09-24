"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { AdminDashboardStats, AdminRecentActivity, AdminRole, AdminUser } from "@/types/admin";

// ---------------------------------------------------------------------------
// AUTHORIZATION
// ---------------------------------------------------------------------------

export async function getAdminRole(): Promise<AdminRole | null> {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data?.role as AdminRole) ?? null;
}

export async function requireAdmin(): Promise<{ authorized: true } | { authorized: false; redirect: string }> {
  const role = await getAdminRole();
  if (role === "admin" || role === "moderator") return { authorized: true };
  return { authorized: false, redirect: "/login?next=/admin" };
}

// ---------------------------------------------------------------------------
// DASHBOARD STATS
// ---------------------------------------------------------------------------

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const defaults: AdminDashboardStats = {
    totalUsers: 0, activeUsers: 0, dailySignups: 0,
    moviesReviewed: 0, collectionsCreated: 0, aiConversations: 0,
    watchQueueItems: 0, dailyActiveUsers: 0, newUsersToday: 0,
    totalReviews: 0, totalAiPicksGenerated: 0, watchTogetherSessions: 0,
  };

  if (!isSupabaseConfigured()) return defaults;
  const supabase = await createSupabaseServerClient();

  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: dailySignups },
      { count: totalReviews },
      { count: collectionsCreated },
      { count: watchQueueItems },
      { count: watchTogetherSessions },
      dailySignupsToday,
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }).gte("last_sign_in_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("reviews").select("*", { count: "exact", head: true }),
      supabase.from("collections").select("*", { count: "exact", head: true }),
      supabase.from("watch_queue").select("*", { count: "exact", head: true }),
      supabase.from("watch_together_sessions").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", today),
    ]);

    return {
      totalUsers: totalUsers ?? 0,
      activeUsers: activeUsers ?? 0,
      dailySignups: dailySignups ?? 0,
      moviesReviewed: totalReviews ?? 0,
      collectionsCreated: collectionsCreated ?? 0,
      aiConversations: 0,
      watchQueueItems: watchQueueItems ?? 0,
      dailyActiveUsers: activeUsers ?? 0,
      newUsersToday: dailySignupsToday.count ?? 0,
      totalReviews: totalReviews ?? 0,
      totalAiPicksGenerated: 0,
      watchTogetherSessions: watchTogetherSessions ?? 0,
    };
  } catch {
    return defaults;
  }
}

// ---------------------------------------------------------------------------
// RECENT ACTIVITY
// ---------------------------------------------------------------------------

export async function getAdminRecentActivity(): Promise<AdminRecentActivity[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const activity: AdminRecentActivity[] = [];

  try {
    // Get recent users
    const { data: recentUsers } = await supabase
      .from("users")
      .select("id, email, display_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentUsers) {
      for (const user of recentUsers) {
        activity.push({
          id: `user-${user.id}`,
          type: "user_joined",
          description: `${user.display_name ?? user.email ?? "A user"} joined Zynora`,
          user: user.display_name ?? user.email,
          timestamp: user.created_at,
        });
      }
    }

    // Get recent reviews
    const { data: recentReviews } = await supabase
      .from("reviews")
      .select("id, user_id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentReviews) {
      for (const review of recentReviews) {
        activity.push({
          id: `review-${review.id}`,
          type: "review_created",
          description: `Review created for "${review.title ?? "a title"}"`,
          user: null,
          timestamp: review.created_at,
          href: `/movies/${review.user_id}`,
        });
      }
    }

    // Get recent collections
    const { data: recentCollections } = await supabase
      .from("collections")
      .select("id, name, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentCollections) {
      for (const col of recentCollections) {
        activity.push({
          id: `collection-${col.id}`,
          type: "collection_created",
          description: `Collection "${col.name}" created`,
          user: null,
          timestamp: col.created_at,
          href: `/collections/${col.id}`,
        });
      }
    }
  } catch {
    // Return whatever we have
  }

  return activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 12);
}

// ---------------------------------------------------------------------------
// USER MANAGEMENT (scaffolded)
// ---------------------------------------------------------------------------

export async function getAdminUsers(): Promise<AdminUser[]> {
  return [];
}

export async function suspendUser(_userId: string): Promise<boolean> {
  return false;
}

export async function banUser(_userId: string): Promise<boolean> {
  return false;
}
