import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStats } from "@/lib/user-stats";
import { getWatchStreak } from "@/lib/goals-streaks";
import { getMonthlyGoals } from "@/lib/goals-streaks";
import { getRecentActivity } from "@/lib/user-activity";
import { getRecentAchievements } from "@/lib/achievements";
import { getWatchHistory } from "@/lib/watch-history";
import { seedAchievements } from "@/lib/achievements";
import type { DashboardData } from "@/types/profile";

/**
 * Aggregates all data needed for the Profile Dashboard.
 * This is the main data-fetching entry point for the dashboard page.
 */
export async function getDashboardData(): Promise<DashboardData | null> {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  // Seed achievements on first dashboard load
  await seedAchievements();

  // Fetch profile data
  const supabase = await createSupabaseServerClient();
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, public_slug")
    .eq("id", user.id)
    .maybeSingle();

  const profile = {
    displayName: profileRow?.display_name ?? null,
    avatarUrl: profileRow?.avatar_url ?? null,
    publicSlug: profileRow?.public_slug ?? null,
    settings: user.user_metadata?.settings ?? {},
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Fetch all dashboard data in parallel
  const [
    stats,
    recentActivity,
    watchStreak,
    monthlyGoals,
    recentAchievements,
    recentHistory,
  ] = await Promise.all([
    getUserStats(),
    getRecentActivity(10),
    getWatchStreak(),
    getMonthlyGoals(currentMonth, currentYear),
    getRecentAchievements(4),
    getWatchHistory({ limit: 5 }),
  ]);

  return {
    profile,
    stats,
    recentActivity,
    watchStreak,
    monthlyGoals,
    recentAchievements,
    continueWatching: recentHistory,
    watchQueuePreview: [],
    dnaSnapshot: null,
  };
}