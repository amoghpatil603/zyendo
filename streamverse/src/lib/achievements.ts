import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { Achievement, AchievementRow, UserAchievement, UserAchievementRow } from "@/types/profile";

// ---------------------------------------------------------------------------
// SEED ACHIEVEMENTS
// ---------------------------------------------------------------------------

export const SEED_ACHIEVEMENTS: Array<{
  slug: string;
  name: string;
  description: string;
  category: Achievement["category"];
  requirementType: string;
  requirementValue: number;
}> = [
  { slug: "first-movie", name: "First Movie", description: "Watch your first movie", category: "milestone", requirementType: "movies_watched", requirementValue: 1 },
  { slug: "ten-movies", name: "Movie Buff", description: "Watch 10 movies", category: "milestone", requirementType: "movies_watched", requirementValue: 10 },
  { slug: "fifty-movies", name: "Film Fanatic", description: "Watch 50 movies", category: "milestone", requirementType: "movies_watched", requirementValue: 50 },
  { slug: "hundred-movies", name: "Cinema Master", description: "Watch 100 movies", category: "milestone", requirementType: "movies_watched", requirementValue: 100 },
  { slug: "first-episode", name: "First Episode", description: "Watch your first TV episode", category: "milestone", requirementType: "episodes_watched", requirementValue: 1 },
  { slug: "hundred-episodes", name: "Binge Watcher", description: "Watch 100 TV episodes", category: "milestone", requirementType: "episodes_watched", requirementValue: 100 },
  { slug: "anime-fan", name: "Anime Fan", description: "Watch 10 anime episodes", category: "milestone", requirementType: "anime_watched", requirementValue: 10 },
  { slug: "horror-lover", name: "Horror Lover", description: "Watch 10 horror titles", category: "genre", requirementType: "genre_horror", requirementValue: 10 },
  { slug: "marvel-marathon", name: "Marvel Marathon", description: "Watch 10 Marvel titles", category: "genre", requirementType: "genre_action", requirementValue: 10 },
  { slug: "weekend-warrior", name: "Weekend Warrior", description: "Watch 3 titles in a single weekend", category: "special", requirementType: "weekend_binge", requirementValue: 3 },
  { slug: "night-owl", name: "Night Owl", description: "Watch 5 titles after midnight", category: "streak", requirementType: "late_night", requirementValue: 5 },
  { slug: "streak-7", name: "Week Streak", description: "Maintain a 7-day watch streak", category: "streak", requirementType: "streak_days", requirementValue: 7 },
  { slug: "streak-30", name: "Month Streak", description: "Maintain a 30-day watch streak", category: "streak", requirementType: "streak_days", requirementValue: 30 },
  { slug: "streak-100", name: "Century Streak", description: "Maintain a 100-day watch streak", category: "streak", requirementType: "streak_days", requirementValue: 100 },
  { slug: "first-review", name: "First Review", description: "Write your first review", category: "milestone", requirementType: "reviews_written", requirementValue: 1 },
  { slug: "ten-reviews", name: "Critic", description: "Write 10 reviews", category: "milestone", requirementType: "reviews_written", requirementValue: 10 },
  { slug: "first-collection", name: "Collector", description: "Create your first collection", category: "milestone", requirementType: "collections_created", requirementValue: 1 },
  { slug: "five-collections", name: "Curator", description: "Create 5 collections", category: "milestone", requirementType: "collections_created", requirementValue: 5 },
];

// ---------------------------------------------------------------------------
// MAPPERS
// ---------------------------------------------------------------------------

export function mapAchievementRow(row: AchievementRow): Achievement {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    iconUrl: row.icon_url,
    category: row.category,
    requirementType: row.requirement_type,
    requirementValue: row.requirement_value,
  };
}

export function mapUserAchievementRow(row: UserAchievementRow & { achievements?: AchievementRow }): UserAchievement {
  return {
    id: row.id,
    userId: row.user_id,
    achievementId: row.achievement_id,
    unlockedAt: row.unlocked_at,
    achievement: row.achievements ? mapAchievementRow(row.achievements as AchievementRow) : undefined,
  };
}

// ---------------------------------------------------------------------------
// SEEDING
// ---------------------------------------------------------------------------

/**
 * Ensures all seed achievements exist in the database.
 * Safe to call multiple times — uses INSERT ... ON CONFLICT DO NOTHING.
 */
export async function seedAchievements(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("achievements").upsert(
    SEED_ACHIEVEMENTS.map((a) => ({
      slug: a.slug,
      name: a.name,
      description: a.description,
      category: a.category,
      requirement_type: a.requirementType,
      requirement_value: a.requirementValue,
    })),
    { onConflict: "slug", ignoreDuplicates: true },
  );

  if (error) {
    console.error("Failed to seed achievements:", error.message);
  }
}

// ---------------------------------------------------------------------------
// FETCHERS
// ---------------------------------------------------------------------------

/**
 * Returns all available achievements.
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .order("requirement_value", { ascending: true });

  if (error || !data) return [];

  return (data as AchievementRow[]).map(mapAchievementRow);
}

/**
 * Returns achievements unlocked by the current user.
 */
export async function getUserAchievements(): Promise<UserAchievement[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_achievements")
    .select("*, achievements(*)")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false });

  if (error || !data) return [];

  return (data as Array<UserAchievementRow & { achievements: AchievementRow }>).map(mapUserAchievementRow);
}

/**
 * Returns the most recently unlocked achievements for the current user.
 */
export async function getRecentAchievements(limit = 5): Promise<UserAchievement[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_achievements")
    .select("*, achievements(*)")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as Array<UserAchievementRow & { achievements: AchievementRow }>).map(mapUserAchievementRow);
}

/**
 * Unlock an achievement for the current user (no-op if already unlocked).
 */
export async function unlockAchievement(achievementId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("user_achievements").upsert(
    {
      user_id: user.id,
      achievement_id: achievementId,
    },
    { onConflict: "user_id,achievement_id", ignoreDuplicates: true },
  );

  return !error;
}

/**
 * Check which achievements are still locked for the current user.
 */
export async function getLockedAchievements(): Promise<Achievement[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const [all, unlocked] = await Promise.all([getAllAchievements(), getUserAchievements()]);

  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));

  return all.filter((a) => !unlockedIds.has(a.id));
}