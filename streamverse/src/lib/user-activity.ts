import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { ActivityType, UserActivity, UserActivityRow } from "@/types/profile";

// ---------------------------------------------------------------------------
// MAPPER
// ---------------------------------------------------------------------------

export function mapUserActivityRow(row: UserActivityRow): UserActivity {
  return {
    id: row.id,
    userId: row.user_id,
    activityType: row.activity_type,
    mediaType: row.media_type,
    mediaId: row.media_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// ACTIVITY LOGGING
// ---------------------------------------------------------------------------

export async function logActivity(input: {
  activityType: ActivityType;
  mediaType?: string | null;
  mediaId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("user_activity").insert({
    user_id: user.id,
    activity_type: input.activityType,
    media_type: input.mediaType ?? null,
    media_id: input.mediaId ?? null,
    metadata: input.metadata ?? null,
  });

  return !error;
}

// ---------------------------------------------------------------------------
// FETCHERS
// ---------------------------------------------------------------------------

export async function getRecentActivity(limit = 10): Promise<UserActivity[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_activity")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as UserActivityRow[]).map(mapUserActivityRow);
}