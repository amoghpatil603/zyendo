"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { AdminRole } from "@/types/admin";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface AdminCollection {
  id: string;
  userId: string;
  userName: string | null;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  isPublic: boolean;
  isHidden: boolean;
  isFeatured: boolean;
  itemCount: number;
  reportCount: number;
  createdAt: string;
}

export interface AdminCollectionReport {
  id: string;
  reporterId: string;
  reporterName: string | null;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface AdminCollectionDetail extends AdminCollection {
  ownerDisplayName: string | null;
  ownerAvatarUrl: string | null;
  reports: AdminCollectionReport[];
  previewItems: { mediaType: string; mediaId: string }[];
}

export interface AdminCollectionStats {
  totalCollections: number;
  createdToday: number;
  publicCollections: number;
  privateCollections: number;
  reportedCollections: number;
  featuredCollections: number;
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

export async function getAdminCollectionStats(): Promise<AdminCollectionStats> {
  const defaults: AdminCollectionStats = {
    totalCollections: 0, createdToday: 0, publicCollections: 0,
    privateCollections: 0, reportedCollections: 0, featuredCollections: 0,
  };
  if (!isSupabaseConfigured()) return defaults;
  const supabase = await createSupabaseServerClient();

  try {
    const today = new Date().toISOString().slice(0, 10);
    const [total, todayCount, pub, featured, reportsResp] = await Promise.all([
      supabase.from("collections").select("*", { count: "exact", head: true }),
      supabase.from("collections").select("*", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("collections").select("*", { count: "exact", head: true }).eq("is_public", true),
      supabase.from("collections").select("*", { count: "exact", head: true }).eq("is_featured", true),
      supabase.from("collection_reports").select("collection_id"),
    ]);

    const distinctReported = new Set((reportsResp.data ?? []).map((r: { collection_id: string }) => r.collection_id)).size;

    return {
      totalCollections: total.count ?? 0,
      createdToday: todayCount.count ?? 0,
      publicCollections: pub.count ?? 0,
      privateCollections: (total.count ?? 0) - (pub.count ?? 0),
      reportedCollections: distinctReported,
      featuredCollections: featured.count ?? 0,
    };
  } catch {
    return defaults;
  }
}

// ---------------------------------------------------------------------------
// LIST COLLECTIONS
// ---------------------------------------------------------------------------

export async function getAdminCollections(options: {
  query?: string; isPublic?: boolean; isHidden?: boolean;
  isFeatured?: boolean; isReported?: boolean; sort?: string;
  page?: number; pageSize?: number;
} = {}): Promise<{ items: AdminCollection[]; total: number; page: number; totalPages: number }> {
  const empty = { items: [] as AdminCollection[], total: 0, page: 1, totalPages: 0 };
  if (!isSupabaseConfigured()) return empty;
  const supabase = await createSupabaseServerClient();

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 20));
  const query = options.query?.trim() ?? "";
  const isPublic = options.isPublic;
  const isHidden = options.isHidden;
  const isFeatured = options.isFeatured;
  const isReported = options.isReported;
  const sort = options.sort ?? "newest";

  try {
    let baseQuery = supabase
      .from("collections")
      .select("id, user_id, name, description, cover_image_url, is_public, is_hidden, is_featured, created_at", { count: "exact" });

    if (query) {
      baseQuery = baseQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }
    if (isPublic !== undefined) baseQuery = baseQuery.eq("is_public", isPublic);
    if (isHidden !== undefined) baseQuery = baseQuery.eq("is_hidden", isHidden);
    if (isFeatured !== undefined) baseQuery = baseQuery.eq("is_featured", isFeatured);

    switch (sort) {
      case "newest": baseQuery = baseQuery.order("created_at", { ascending: false }); break;
      case "oldest": baseQuery = baseQuery.order("created_at", { ascending: true }); break;
      default: baseQuery = baseQuery.order("created_at", { ascending: false });
    }

    const { data: collections, count, error } = await baseQuery.range(
      (page - 1) * pageSize, page * pageSize - 1,
    );

    if (error || !collections) return empty;

    const collectionIds = collections.map((c) => c.id);
    const userIds = collections.map((c) => c.user_id);

    const [profilesResp, countsResp, reportsResp] = await Promise.all([
      supabase.from("profiles").select("id, display_name").in("id", userIds),
      supabase.from("collection_items").select("collection_id").in("collection_id", collectionIds),
      supabase.from("collection_reports").select("collection_id").in("collection_id", collectionIds),
    ]);

    const nameMap = new Map((profilesResp.data ?? []).map((p) => [p.id, p.display_name]));
    const itemCountMap = new Map<string, number>();
    for (const r of countsResp.data ?? []) itemCountMap.set(r.collection_id, (itemCountMap.get(r.collection_id) ?? 0) + 1);
    const reportCountMap = new Map<string, number>();
    for (const r of reportsResp.data ?? []) reportCountMap.set(r.collection_id, (reportCountMap.get(r.collection_id) ?? 0) + 1);

    let items: AdminCollection[] = collections.map((c) => ({
      id: c.id, userId: c.user_id, userName: nameMap.get(c.user_id) ?? null,
      name: c.name, description: c.description, coverImageUrl: c.cover_image_url,
      isPublic: c.is_public, isHidden: c.is_hidden ?? false, isFeatured: c.is_featured ?? false,
      itemCount: itemCountMap.get(c.id) ?? 0, reportCount: reportCountMap.get(c.id) ?? 0,
      createdAt: c.created_at,
    }));

    // In-memory filters
    if (isReported) items = items.filter((c) => c.reportCount > 0);
    if (sort === "most_items") items.sort((a, b) => b.itemCount - a.itemCount);
    if (sort === "most_reported") items.sort((a, b) => b.reportCount - a.reportCount);

    return { items, total: count ?? items.length, page, totalPages: Math.ceil((count ?? items.length) / pageSize) };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// GET SINGLE COLLECTION DETAIL
// ---------------------------------------------------------------------------

export async function getAdminCollectionDetail(collectionId: string): Promise<AdminCollectionDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();

  try {
    const collResp = await supabase.from("collections").select("*").eq("id", collectionId).maybeSingle();
    const coll = collResp.data;
    if (!coll) return null;

    const [profileResp, itemsResp, reportsResp] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url").eq("id", coll.user_id).maybeSingle(),
      supabase.from("collection_items").select("media_type, media_id").eq("collection_id", collectionId).limit(5),
      supabase.from("collection_reports").select(`
        id, reporter_id, reason, description, status, created_at
      `).eq("collection_id", collectionId).order("created_at", { ascending: false }),
    ]);

    const reports: AdminCollectionReport[] = ((reportsResp.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string, reporterId: r.reporter_id as string, reporterName: null,
      reason: r.reason as string, description: (r.description as string) ?? null,
      status: r.status as string, createdAt: r.created_at as string,
    }));

    const profile = profileResp.data;
    const rawItems = (itemsResp.data ?? []) as { media_type: string; media_id: string }[];
    const previewItems = rawItems.map((i) => ({ mediaType: i.media_type, mediaId: i.media_id }));

    return {
      id: coll.id, userId: coll.user_id, userName: profile?.display_name ?? null,
      ownerDisplayName: profile?.display_name ?? null, ownerAvatarUrl: profile?.avatar_url ?? null,
      name: coll.name, description: coll.description, coverImageUrl: coll.cover_image_url,
      isPublic: coll.is_public, isHidden: coll.is_hidden ?? false, isFeatured: coll.is_featured ?? false,
      itemCount: rawItems.length, reportCount: reports.length, createdAt: coll.created_at, reports, previewItems,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// MODERATION ACTIONS
// ---------------------------------------------------------------------------

async function logAction(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, adminId: string, action: string, collectionId: string, details?: Record<string, unknown>) {
  try { await supabase.from("admin_audit_log").insert({ admin_user_id: adminId, action, target_type: "collection", target_id: collectionId, details: details ?? null }); }
  catch (e) { console.error("Failed to log action:", e); }
}

async function toggleFlag(collectionId: string, field: "is_hidden" | "is_featured", value: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator();
  if (!admin) return { ok: false, error: "Unauthorized." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createSupabaseServerClient();
  try {
    const { error } = await supabase.from("collections").update({ [field]: value }).eq("id", collectionId);
    if (error) return { ok: false, error: error.message };
    await logAction(supabase, admin.userId, `${field}_${value}`, collectionId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function hideCollection(id: string) { return toggleFlag(id, "is_hidden", true); }
export async function unhideCollection(id: string) { return toggleFlag(id, "is_hidden", false); }
export async function featureCollection(id: string) { return toggleFlag(id, "is_featured", true); }
export async function unfeatureCollection(id: string) { return toggleFlag(id, "is_featured", false); }

export async function deleteCollection(collectionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator();
  if (!admin) return { ok: false, error: "Unauthorized." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createSupabaseServerClient();
  try {
    const { error } = await supabase.from("collections").delete().eq("id", collectionId);
    if (error) return { ok: false, error: error.message };
    await logAction(supabase, admin.userId, "delete_collection", collectionId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function resolveCollectionReport(reportId: string, resolution: "resolved" | "dismissed"): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator();
  if (!admin) return { ok: false, error: "Unauthorized." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createSupabaseServerClient();
  try {
    const { error } = await supabase.from("collection_reports").update({ status: resolution, resolved_at: new Date().toISOString(), resolved_by: admin.userId }).eq("id", reportId);
    if (error) return { ok: false, error: error.message };
    await logAction(supabase, admin.userId, `${resolution}_collection_report`, reportId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}
