"use server";

import { revalidatePath } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { logWatchHistory, removeWatchHistoryEntry, getWatchHistory, getGroupedWatchHistory, clearWatchHistory } from "@/lib/watch-history";
import { createMonthlyGoal, deleteMonthlyGoal, updateGoalProgress, getMonthlyGoals, recordWatchStreak } from "@/lib/goals-streaks";
import { logActivity } from "@/lib/user-activity";
import { computeAndCacheStats } from "@/lib/user-stats";
import { getDashboardData } from "@/lib/dashboard";

import type { GoalType } from "@/types/profile";

// ---------------------------------------------------------------------------
// SHARED HELPERS
// ---------------------------------------------------------------------------

interface ActionFailure {
  ok: false;
  error: "unauthenticated" | "unconfigured" | "failed";
}

interface ActionSuccess<T = undefined> {
  ok: true;
  data: T;
}

type ActionResult<T = undefined> = ActionFailure | ActionSuccess<T>;

function unauthenticated(): ActionFailure {
  return { ok: false, error: "unauthenticated" };
}

function unconfigured(): ActionFailure {
  return { ok: false, error: "unconfigured" };
}

function failed(): ActionFailure {
  return { ok: false, error: "failed" };
}

async function requireAuth(): Promise<{ ok: true; userId: string } | ActionFailure> {
  if (!isSupabaseConfigured()) return unconfigured();
  const user = await getCurrentUser();
  if (!user) return unauthenticated();
  return { ok: true, userId: user.id };
}

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------

export async function getDashboardAction(): Promise<
  ActionSuccess<Awaited<ReturnType<typeof getDashboardData>>> | ActionFailure
> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  try {
    const data = await getDashboardData();
    return { ok: true, data };
  } catch {
    return failed();
  }
}

// ---------------------------------------------------------------------------
// WATCH HISTORY
// ---------------------------------------------------------------------------

export async function logWatchHistoryAction(input: {
  mediaType: string;
  mediaId: string;
  title: string;
  coverImageUrl?: string | null;
  durationMinutes?: number | null;
  rating?: number | null;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.mediaType || !input?.mediaId || !input?.title) return failed();

  try {
    const ok = await logWatchHistory(input);
    if (!ok) return failed();

    // Update streak and log activity
    await Promise.all([
      recordWatchStreak(),
      logActivity({
        activityType: "watched",
        mediaType: input.mediaType,
        mediaId: input.mediaId,
        metadata: { title: input.title },
      }),
    ]);

    revalidatePath("/profile");
    revalidatePath("/history");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function getWatchHistoryAction(options?: {
  mediaType?: string;
  limit?: number;
}): Promise<ActionSuccess<Awaited<ReturnType<typeof getWatchHistory>>> | ActionFailure> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  try {
    const data = await getWatchHistory(options);
    return { ok: true, data };
  } catch {
    return failed();
  }
}

export async function getGroupedWatchHistoryAction(options?: {
  mediaType?: string;
  limit?: number;
}): Promise<ActionSuccess<Awaited<ReturnType<typeof getGroupedWatchHistory>>> | ActionFailure> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  try {
    const data = await getGroupedWatchHistory(options);
    return { ok: true, data };
  } catch {
    return failed();
  }
}

export async function removeWatchHistoryEntryAction(input: {
  id: string;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.id) return failed();

  try {
    const ok = await removeWatchHistoryEntry(input.id);
    if (!ok) return failed();
    revalidatePath("/profile");
    revalidatePath("/history");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function clearWatchHistoryAction(): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  try {
    const ok = await clearWatchHistory();
    if (!ok) return failed();
    revalidatePath("/profile");
    revalidatePath("/history");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

// ---------------------------------------------------------------------------
// MONTHLY GOALS
// ---------------------------------------------------------------------------

export async function createMonthlyGoalAction(input: {
  goalType: GoalType;
  targetValue: number;
  metadata?: Record<string, unknown> | null;
}): Promise<ActionSuccess<Awaited<ReturnType<typeof createMonthlyGoal>>> | ActionFailure> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.goalType || !input?.targetValue) return failed();

  try {
    const goal = await createMonthlyGoal(input);
    if (!goal) return failed();
    revalidatePath("/profile");
    return { ok: true, data: goal };
  } catch {
    return failed();
  }
}

export async function updateGoalProgressAction(input: {
  goalId: string;
  incrementBy?: number;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.goalId) return failed();

  try {
    const ok = await updateGoalProgress(input.goalId, input.incrementBy ?? 1);
    if (!ok) return failed();
    revalidatePath("/profile");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function deleteMonthlyGoalAction(input: {
  goalId: string;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!input?.goalId) return failed();

  try {
    const ok = await deleteMonthlyGoal(input.goalId);
    if (!ok) return failed();
    revalidatePath("/profile");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

// ---------------------------------------------------------------------------
// STATS
// ---------------------------------------------------------------------------

export async function recomputeStatsAction(): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  try {
    await computeAndCacheStats(auth.userId);
    revalidatePath("/profile");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

// ---------------------------------------------------------------------------
// PROFILE
// ---------------------------------------------------------------------------

export interface ProfileData {
  displayName: string | null;
  avatarUrl: string | null;
  publicSlug: string | null;
  settings: Record<string, any>;
}

export async function getProfileAction(): Promise<ActionSuccess<ProfileData> | ActionFailure> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  try {
    const supabase = await (await import("@/lib/supabase/server")).createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, public_slug")
      .eq("id", auth.userId)
      .maybeSingle();

    if (error || !data) return failed();

    const user = await getCurrentUser();

    return {
      ok: true,
      data: {
        displayName: data.display_name ?? null,
        avatarUrl: data.avatar_url ?? null,
        publicSlug: data.public_slug ?? null,
        settings: user?.user_metadata?.settings ?? {},
      },
    };
  } catch {
    return failed();
  }
}

export async function updateProfileAction(input: {
  displayName?: string | null;
  avatarUrl?: string | null;
  publicSlug?: string | null;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  try {
    const supabase = await (await import("@/lib/supabase/server")).createSupabaseServerClient();
    const updates: Record<string, unknown> = {};
    if (input.displayName !== undefined) updates.display_name = input.displayName;
    if (input.avatarUrl !== undefined) updates.avatar_url = input.avatarUrl;
    if (input.publicSlug !== undefined) updates.public_slug = input.publicSlug;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", auth.userId);

    if (error) return failed();
    revalidatePath("/profile");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}

export async function updateSettingsAction(settings: Record<string, any>): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  try {
    const supabase = await (await import("@/lib/supabase/server")).createSupabaseServerClient();
    const user = await getCurrentUser();
    if (!user) return failed();

    const currentSettings = user.user_metadata?.settings ?? {};
    const newSettings = { ...currentSettings, ...settings };

    const { error } = await supabase.auth.updateUser({
      data: { settings: newSettings }
    });

    if (error) return failed();
    revalidatePath("/settings");
    return { ok: true, data: undefined };
  } catch {
    return failed();
  }
}