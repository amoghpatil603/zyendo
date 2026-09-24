import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type {
  GoalType,
  MonthlyGoal,
  MonthlyGoalRow,
  WatchStreak,
  WatchStreakRow,
} from "@/types/profile";

// ---------------------------------------------------------------------------
// MAPPERS
// ---------------------------------------------------------------------------

export function mapMonthlyGoalRow(row: MonthlyGoalRow): MonthlyGoal {
  return {
    id: row.id,
    userId: row.user_id,
    goalType: row.goal_type,
    targetValue: row.target_value,
    currentValue: row.current_value,
    metadata: row.metadata,
    month: row.month,
    year: row.year,
    completed: row.completed,
  };
}

export function mapWatchStreakRow(row: WatchStreakRow): WatchStreak {
  return {
    id: row.id,
    userId: row.user_id,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastWatchDate: row.last_watch_date,
  };
}

// ---------------------------------------------------------------------------
// MONTHLY GOALS
// ---------------------------------------------------------------------------

/**
 * Returns monthly goals for the current user, optionally filtered by month/year.
 */
export async function getMonthlyGoals(month?: number, year?: number): Promise<MonthlyGoal[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  const { data, error } = await supabase
    .from("monthly_goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", targetMonth)
    .eq("year", targetYear)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return (data as MonthlyGoalRow[]).map(mapMonthlyGoalRow);
}

/**
 * Create a new monthly goal.
 */
export async function createMonthlyGoal(input: {
  goalType: GoalType;
  targetValue: number;
  metadata?: Record<string, unknown> | null;
}): Promise<MonthlyGoal | null> {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("monthly_goals")
    .insert({
      user_id: user.id,
      goal_type: input.goalType,
      target_value: input.targetValue,
      metadata: input.metadata ?? null,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    })
    .select()
    .single();

  if (error || !data) return null;

  return mapMonthlyGoalRow(data as MonthlyGoalRow);
}

/**
 * Update the current value of a goal. If it reaches or exceeds target, marks as completed.
 */
export async function updateGoalProgress(goalId: string, incrementBy = 1): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  // Get current goal state
  const { data: goal } = await supabase
    .from("monthly_goals")
    .select("current_value, target_value")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (!goal) return false;

  const newValue = (goal.current_value as number) + incrementBy;
  const completed = newValue >= (goal.target_value as number);

  const { error } = await supabase
    .from("monthly_goals")
    .update({
      current_value: newValue,
      completed,
    })
    .eq("id", goalId)
    .eq("user_id", user.id);

  return !error;
}

/**
 * Delete a monthly goal.
 */
export async function deleteMonthlyGoal(goalId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("monthly_goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", user.id);

  return !error;
}

// ---------------------------------------------------------------------------
// WATCH STREAKS
// ---------------------------------------------------------------------------

/**
 * Returns the current watch streak for the authenticated user.
 */
export async function getWatchStreak(): Promise<WatchStreak | null> {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("watch_streaks")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return mapWatchStreakRow(data as WatchStreakRow);
}

/**
 * Record a watch event and update the streak.
 * Should be called whenever a user logs a watch.
 */
export async function recordWatchStreak(): Promise<WatchStreak | null> {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().split("T")[0];

  // Get or create streak record
  const { data: existing } = await supabase
    .from("watch_streaks")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { data, error } = await supabase
      .from("watch_streaks")
      .insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_watch_date: today,
      })
      .select()
      .single();

    if (error || !data) return null;
    return mapWatchStreakRow(data as WatchStreakRow);
  }

  const streak = existing as WatchStreakRow;
  const lastDate = streak.last_watch_date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newCurrent = streak.current_streak;
  let newLongest = streak.longest_streak;

  if (lastDate === today) {
    // Already recorded today — no change
    return mapWatchStreakRow(streak);
  } else if (lastDate === yesterdayStr) {
    // Consecutive day
    newCurrent += 1;
    newLongest = Math.max(newLongest, newCurrent);
  } else {
    // Streak broken
    newCurrent = 1;
  }

  const { data, error } = await supabase
    .from("watch_streaks")
    .update({
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_watch_date: today,
    })
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) return null;
  return mapWatchStreakRow(data as WatchStreakRow);
}