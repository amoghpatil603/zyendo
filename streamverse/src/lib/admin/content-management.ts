"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { AdminRole } from "@/types/admin";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string | null;
  mediaType: string | null;
  mediaId: string | null;
  backdropUrl: string | null;
  overlayColor: string;
  ctaLabel: string;
  ctaHref: string | null;
  sortOrder: number;
  isActive: boolean;
  scheduledFrom: string | null;
  scheduledUntil: string | null;
}

export interface FeaturedContentItem {
  id: string;
  mediaType: string;
  mediaId: string;
  label: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface EditorialCollection {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  mediaType: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  sortOrder: number;
  itemCount: number;
  createdAt: string;
}

export interface HomepageSection {
  id: string;
  sectionKey: string;
  label: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface CmsStats {
  featuredMovies: number;
  featuredTv: number;
  featuredAnime: number;
  editorialCollections: number;
  heroBanners: number;
  homepageSections: number;
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

export async function getCmsStats(): Promise<CmsStats> {
  if (!isSupabaseConfigured()) return { featuredMovies: 0, featuredTv: 0, featuredAnime: 0, editorialCollections: 0, heroBanners: 0, homepageSections: 0 };
  const supabase = await createSupabaseServerClient();
  try {
    const [movies, tv, anime, collections, banners, sections] = await Promise.all([
      supabase.from("featured_content").select("*", { count: "exact", head: true }).eq("media_type", "movie").eq("is_active", true),
      supabase.from("featured_content").select("*", { count: "exact", head: true }).eq("media_type", "tv").eq("is_active", true),
      supabase.from("featured_content").select("*", { count: "exact", head: true }).eq("media_type", "anime").eq("is_active", true),
      supabase.from("editorial_collections").select("*", { count: "exact", head: true }),
      supabase.from("hero_banners").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("homepage_sections").select("*", { count: "exact", head: true }),
    ]);
    return {
      featuredMovies: movies.count ?? 0, featuredTv: tv.count ?? 0, featuredAnime: anime.count ?? 0,
      editorialCollections: collections.count ?? 0, heroBanners: banners.count ?? 0, homepageSections: sections.count ?? 0,
    };
  } catch { return { featuredMovies: 0, featuredTv: 0, featuredAnime: 0, editorialCollections: 0, heroBanners: 0, homepageSections: 0 }; }
}

// ---------------------------------------------------------------------------
// HERO BANNERS
// ---------------------------------------------------------------------------

export async function getHeroBanners(): Promise<HeroBanner[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("hero_banners").select("*").order("sort_order", { ascending: true });
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string, title: r.title as string, subtitle: (r.subtitle as string) ?? null,
    mediaType: (r.media_type as string) ?? null, mediaId: (r.media_id as string) ?? null,
    backdropUrl: (r.backdrop_url as string) ?? null, overlayColor: (r.overlay_color as string) ?? "rgba(0,0,0,0.5)",
    ctaLabel: (r.cta_label as string) ?? "Watch Now", ctaHref: (r.cta_href as string) ?? null,
    sortOrder: (r.sort_order as number) ?? 0, isActive: (r.is_active as boolean) ?? true,
    scheduledFrom: (r.scheduled_from as string) ?? null, scheduledUntil: (r.scheduled_until as string) ?? null,
  }));
}

export async function upsertHeroBanner(data: Partial<HeroBanner> & { title: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator(); if (!admin) return { ok: false, error: "Unauthorized." };
  const supabase = await createSupabaseServerClient();
  const row: Record<string, unknown> = { title: data.title };
  if (data.subtitle !== undefined) row.subtitle = data.subtitle;
  if (data.mediaType !== undefined) row.media_type = data.mediaType;
  if (data.mediaId !== undefined) row.media_id = data.mediaId;
  if (data.backdropUrl !== undefined) row.backdrop_url = data.backdropUrl;
  if (data.overlayColor !== undefined) row.overlay_color = data.overlayColor;
  if (data.ctaLabel !== undefined) row.cta_label = data.ctaLabel;
  if (data.ctaHref !== undefined) row.cta_href = data.ctaHref;
  if (data.sortOrder !== undefined) row.sort_order = data.sortOrder;
  if (data.isActive !== undefined) row.is_active = data.isActive;
  if (data.scheduledFrom !== undefined) row.scheduled_from = data.scheduledFrom;
  if (data.scheduledUntil !== undefined) row.scheduled_until = data.scheduledUntil;
  const { error } = data.id
    ? await supabase.from("hero_banners").update(row).eq("id", data.id)
    : await supabase.from("hero_banners").insert(row);
  if (error) return { ok: false, error: error.message };
  await logAction(supabase, admin.userId, data.id ? "update_hero_banner" : "create_hero_banner", data.id ?? "new");
  return { ok: true };
}

export async function deleteHeroBanner(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator(); if (!admin) return { ok: false, error: "Unauthorized." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("hero_banners").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAction(supabase, admin.userId, "delete_hero_banner", id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// FEATURED CONTENT
// ---------------------------------------------------------------------------

export async function getFeaturedContent(): Promise<FeaturedContentItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("featured_content").select("*").order("sort_order", { ascending: true });
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string, mediaType: r.media_type as string, mediaId: r.media_id as string,
    label: (r.label as string) ?? null, sortOrder: (r.sort_order as number) ?? 0,
    isActive: (r.is_active as boolean) ?? true, createdAt: r.created_at as string,
  }));
}

export async function addFeaturedContent(mediaType: string, mediaId: string, label?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator(); if (!admin) return { ok: false, error: "Unauthorized." };
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase.from("featured_content").select("*", { count: "exact", head: true });
  const { error } = await supabase.from("featured_content").insert({
    media_type: mediaType, media_id: mediaId, label: label ?? null, sort_order: count ?? 0, created_by: admin.userId,
  });
  if (error) return { ok: false, error: error.message };
  await logAction(supabase, admin.userId, "add_featured_content", `${mediaType}:${mediaId}`);
  return { ok: true };
}

export async function removeFeaturedContent(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator(); if (!admin) return { ok: false, error: "Unauthorized." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("featured_content").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAction(supabase, admin.userId, "remove_featured_content", id);
  return { ok: true };
}

export async function reorderFeaturedContent(ids: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator(); if (!admin) return { ok: false, error: "Unauthorized." };
  const supabase = await createSupabaseServerClient();
  for (let i = 0; i < ids.length; i++) {
    await supabase.from("featured_content").update({ sort_order: i }).eq("id", ids[i]);
  }
  await logAction(supabase, admin.userId, "reorder_featured_content");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// EDITORIAL COLLECTIONS
// ---------------------------------------------------------------------------

export async function getEditorialCollections(): Promise<EditorialCollection[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("editorial_collections").select(`
    id, title, slug, description, cover_image_url, media_type, is_published, published_at, sort_order, created_at,
    editorial_collection_items(count)
  `).order("sort_order", { ascending: true });
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string, title: r.title as string, slug: r.slug as string,
    description: (r.description as string) ?? null, coverImageUrl: (r.cover_image_url as string) ?? null,
    mediaType: (r.media_type as string) ?? null, isPublished: (r.is_published as boolean) ?? false,
    publishedAt: (r.published_at as string) ?? null, sortOrder: (r.sort_order as number) ?? 0,
    itemCount: ((r.editorial_collection_items as Array<Record<string, unknown>>)?.[0]?.count as number) ?? 0,
    createdAt: r.created_at as string,
  }));
}

export async function upsertEditorialCollection(data: Partial<EditorialCollection> & { title: string; slug: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = await requireModerator(); if (!admin) return { ok: false, error: "Unauthorized." };
  const supabase = await createSupabaseServerClient();
  const row: Record<string, unknown> = { title: data.title, slug: data.slug };
  if (data.description !== undefined) row.description = data.description;
  if (data.coverImageUrl !== undefined) row.cover_image_url = data.coverImageUrl;
  if (data.mediaType !== undefined) row.media_type = data.mediaType;
  if (data.isPublished !== undefined) row.is_published = data.isPublished;
  if (data.isPublished) row.published_at = new Date().toISOString();
  if (data.sortOrder !== undefined) row.sort_order = data.sortOrder;
  const { data: result, error } = data.id
    ? await supabase.from("editorial_collections").update(row).eq("id", data.id).select("id").single()
    : await supabase.from("editorial_collections").insert({ ...row, created_by: admin.userId }).select("id").single();
  if (error) return { ok: false, error: error.message };
  await logAction(supabase, admin.userId, data.id ? "update_editorial_collection" : "create_editorial_collection", result?.id as string);
  return { ok: true, id: result?.id as string };
}

export async function deleteEditorialCollection(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator(); if (!admin) return { ok: false, error: "Unauthorized." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("editorial_collections").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAction(supabase, admin.userId, "delete_editorial_collection", id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// HOMEPAGE SECTIONS
// ---------------------------------------------------------------------------

export async function getHomepageSections(): Promise<HomepageSection[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("homepage_sections").select("*").order("sort_order", { ascending: true });
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string, sectionKey: r.section_key as string, label: r.label as string,
    isEnabled: (r.is_enabled as boolean) ?? true, sortOrder: (r.sort_order as number) ?? 0,
  }));
}

export async function toggleHomepageSection(id: string, isEnabled: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireModerator(); if (!admin) return { ok: false, error: "Unauthorized." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("homepage_sections").update({ is_enabled: isEnabled }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAction(supabase, admin.userId, `toggle_section_${isEnabled ? "on" : "off"}`, id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// AUDIT LOG
// ---------------------------------------------------------------------------

async function logAction(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, adminId: string, action: string, targetId?: string) {
  try {
    await supabase.from("admin_audit_log").insert({ admin_user_id: adminId, action, target_type: "content", target_id: targetId ?? null });
  } catch (e) { console.error("Failed to log:", e); }
}
