"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type {
  AdminRole, AdminUser, AdminUserDetail, AdminUserStats,
  PaginatedResult, UserStatus,
} from "@/types/admin";

// ---------------------------------------------------------------------------
// AUTHORIZATION HELPERS
// ---------------------------------------------------------------------------

async function requireAdminRole(): Promise<{ userId: string; role: AdminRole } | null> {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const role = data?.role as AdminRole | undefined;
  if (!role || (role !== "admin" && role !== "moderator")) return null;
  return { userId: user.id, role };
}

async function requireFullAdmin(): Promise<string | null> {
  const auth = await requireAdminRole();
  if (!auth || auth.role !== "admin") return null;
  return auth.userId;
}

// ---------------------------------------------------------------------------
// STATS
// ---------------------------------------------------------------------------

export async function getAdminUserStats(): Promise<AdminUserStats> {
  const defaults: AdminUserStats = {
    totalUsers: 0, activeUsers: 0, newUsersToday: 0, newUsersThisWeek: 0,
    adminCount: 0, moderatorCount: 0, suspendedUsers: 0,
  };
  if (!isSupabaseConfigured()) return defaults;
  const supabase = await createSupabaseServerClient();

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [total, suspended, todaySignups, weekSignups, admins, mods] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "suspended"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("admin_roles").select("*", { count: "exact", head: true }).eq("role", "admin"),
      supabase.from("admin_roles").select("*", { count: "exact", head: true }).eq("role", "moderator"),
    ]);

    return {
      totalUsers: total.count ?? 0,
      activeUsers: (total.count ?? 0) - (suspended.count ?? 0),
      newUsersToday: todaySignups.count ?? 0,
      newUsersThisWeek: weekSignups.count ?? 0,
      adminCount: admins.count ?? 0,
      moderatorCount: mods.count ?? 0,
      suspendedUsers: suspended.count ?? 0,
    };
  } catch {
    return defaults;
  }
}

// ---------------------------------------------------------------------------
// LIST USERS (paginated, searchable, filterable, sortable)
// ---------------------------------------------------------------------------

export async function getAdminUsers(options: {
  query?: string;
  role?: AdminRole | "";
  status?: UserStatus | "";
  sort?: "newest" | "oldest" | "most_active" | "most_reviews" | "most_collections";
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedResult<AdminUser>> {
  const empty: PaginatedResult<AdminUser> = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  if (!isSupabaseConfigured()) return empty;
  const supabase = await createSupabaseServerClient();

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 20));
  const query = options.query?.trim() ?? "";
  const roleFilter = options.role ?? "";
  const statusFilter = options.status ?? "";
  const sort = options.sort ?? "newest";

  try {
    // Fetch profiles
    let baseQuery = supabase
      .from("profiles")
      .select("id, display_name, avatar_url, status, created_at", { count: "exact" });

    if (query) {
      baseQuery = baseQuery.ilike("display_name", `%${query}%`);
    }
    if (statusFilter) {
      baseQuery = baseQuery.eq("status", statusFilter);
    }

    switch (sort) {
      case "newest": baseQuery = baseQuery.order("created_at", { ascending: false }); break;
      case "oldest": baseQuery = baseQuery.order("created_at", { ascending: true }); break;
      default: baseQuery = baseQuery.order("created_at", { ascending: false });
    }

    const { data: profiles, count, error } = await baseQuery.range(
      (page - 1) * pageSize,
      page * pageSize - 1,
    );

    if (error || !profiles) return empty;

    const userIds = profiles.map((p) => p.id);

    // Fetch roles, review counts, collection counts, queue counts in parallel
    const [roleResp, reviewResp, collectionResp, queueResp] = await Promise.all([
      supabase.from("admin_roles").select("user_id, role").in("user_id", userIds),
      supabase.from("reviews").select("user_id").in("user_id", userIds),
      supabase.from("collections").select("user_id").in("user_id", userIds),
      supabase.from("watch_queue").select("user_id").in("user_id", userIds),
    ]);

    const roleMap = new Map((roleResp.data ?? []).map((r) => [r.user_id, r.role as AdminRole]));
    const reviewCountMap = new Map<string, number>();
    const collectionCountMap = new Map<string, number>();
    const queueCountMap = new Map<string, number>();

    for (const r of reviewResp.data ?? []) reviewCountMap.set(r.user_id, (reviewCountMap.get(r.user_id) ?? 0) + 1);
    for (const r of collectionResp.data ?? []) collectionCountMap.set(r.user_id, (collectionCountMap.get(r.user_id) ?? 0) + 1);
    for (const r of queueResp.data ?? []) queueCountMap.set(r.user_id, (queueCountMap.get(r.user_id) ?? 0) + 1);

    let items: AdminUser[] = profiles.map((p) => ({
      id: p.id,
      email: "",
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      role: roleMap.get(p.id) ?? "viewer",
      status: (p.status as UserStatus) ?? "active",
      createdAt: p.created_at,
      lastSignInAt: null,
      reviewsCount: reviewCountMap.get(p.id) ?? 0,
      collectionsCount: collectionCountMap.get(p.id) ?? 0,
      watchQueueCount: queueCountMap.get(p.id) ?? 0,
    }));

    // Apply role filter in-memory
    if (roleFilter) {
      items = items.filter((u) => u.role === roleFilter);
    }

    // Sort by computed columns
    if (sort === "most_reviews") items.sort((a, b) => b.reviewsCount - a.reviewsCount);
    else if (sort === "most_collections") items.sort((a, b) => b.collectionsCount - a.collectionsCount);

    return {
      items,
      total: count ?? items.length,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? items.length) / pageSize),
    };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// GET SINGLE USER DETAILS
// ---------------------------------------------------------------------------

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();

  try {
    const [profileResp, roleResp, reviewsCount, collectionsCount, watchQueueCount, dnaResp, achievementsResp, activityResp] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("admin_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("collections").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("watch_queue").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("entertainment_dna").select("genre_weights, last_computed_at").eq("user_id", userId).maybeSingle(),
      supabase.from("user_achievements").select("id, achievement_id, unlocked_at").eq("user_id", userId).order("unlocked_at", { ascending: false }).limit(5),
      supabase.from("user_activity").select("activity_type, metadata, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);

    const profile = profileResp.data;
    if (!profile) return null;

    const role = (roleResp.data?.role as AdminRole) ?? "viewer";
    const dnaData = dnaResp.data;
    const dnaGenres = dnaData?.genre_weights ? (dnaData.genre_weights as Array<unknown>).length : 0;

    return {
      id: profile.id,
      email: "",
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      role,
      status: (profile.status as UserStatus) ?? "active",
      createdAt: profile.created_at,
      lastSignInAt: null,
      reviewsCount: reviewsCount.count ?? 0,
      collectionsCount: collectionsCount.count ?? 0,
      watchQueueCount: watchQueueCount.count ?? 0,
      bio: null,
      achievements: (achievementsResp.data ?? []).map((a) => ({
        id: a.id,
        name: "Unlocked Achievement",
        unlockedAt: a.unlocked_at,
      })),
      dnaSummary: dnaData ? { genres: dnaGenres, lastComputed: dnaData.last_computed_at } : null,
      recentActivity: (activityResp.data ?? []).map((a) => ({
        type: a.activity_type,
        description: (a.metadata as Record<string, unknown> | null)?.["title"] as string ?? a.activity_type,
        timestamp: a.created_at,
      })),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// ADMIN ACTIONS
// ---------------------------------------------------------------------------

async function logAction(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  adminId: string,
  action: string,
  targetUserId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("admin_audit_log").insert({
      admin_user_id: adminId,
      action,
      target_user_id: targetUserId,
      target_type: "user",
      target_id: targetUserId,
      details: details ?? null,
    });
  } catch (e) {
    console.error("Failed to log admin action:", e);
  }
}

export async function changeUserRole(targetUserId: string, newRole: AdminRole): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireFullAdmin();
  if (!adminId) return { ok: false, error: "Unauthorized. Only admins can change roles." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase
      .from("admin_roles")
      .upsert({ user_id: targetUserId, role: newRole }, { onConflict: "user_id" });

    if (error) return { ok: false, error: error.message };

    await logAction(supabase, adminId, "change_role", targetUserId, { newRole });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to change role." };
  }
}

export async function updateUserStatus(targetUserId: string, newStatus: UserStatus): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdminRole();
  if (!admin) return { ok: false, error: "Unauthorized." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createSupabaseServerClient();

  // Moderators cannot suspend/ban admins
  if (admin.role === "moderator") {
    const { data: targetRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (targetRole?.role === "admin") return { ok: false, error: "Moderators cannot modify admin accounts." };
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", targetUserId);

    if (error) return { ok: false, error: error.message };

    await logAction(supabase, admin.userId, `update_status_${newStatus}`, targetUserId, { newStatus });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update status." };
  }
}

export async function deleteUser(targetUserId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireFullAdmin();
  if (!adminId) return { ok: false, error: "Unauthorized. Only admins can delete accounts." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase.auth.admin.deleteUser(targetUserId);
    if (error) return { ok: false, error: error.message };

    await logAction(supabase, adminId, "delete_user", targetUserId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete user." };
  }
}
