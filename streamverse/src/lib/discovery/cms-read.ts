import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types (public read-only subset — no admin mutation types)
// ---------------------------------------------------------------------------

export interface CmsHeroBanner {
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
}

export interface CmsFeaturedItem {
  id: string;
  mediaType: string;
  mediaId: string;
  label: string | null;
  sortOrder: number;
}

export interface CmsEditorialCollection {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  mediaType: string | null;
  itemCount: number;
  sortOrder: number;
}

export interface CmsEditorialCollectionItem {
  id: string;
  mediaType: string;
  mediaId: string;
  note: string | null;
  sortOrder: number;
}

export interface CmsHomepageSection {
  id: string;
  sectionKey: string;
  isEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Hero Banners
// ---------------------------------------------------------------------------

/**
 * Load active hero banners respecting scheduling and sort order.
 * Returns only banners that are:
 * - is_active = true
 * - scheduled_from is null or in the past
 * - scheduled_until is null or in the future
 */
export async function getActiveHeroBanners(): Promise<CmsHeroBanner[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("hero_banners")
    .select("*")
    .eq("is_active", true)
    .lte("scheduled_from", now)
    .or(`scheduled_until.gt.${now},scheduled_until.is.null`)
    .order("sort_order", { ascending: true });

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    subtitle: (r.subtitle as string) ?? null,
    mediaType: (r.media_type as string) ?? null,
    mediaId: (r.media_id as string) ?? null,
    backdropUrl: (r.backdrop_url as string) ?? null,
    overlayColor: (r.overlay_color as string) ?? "rgba(0,0,0,0.5)",
    ctaLabel: (r.cta_label as string) ?? "Watch Now",
    ctaHref: (r.cta_href as string) ?? null,
    sortOrder: (r.sort_order as number) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Featured Content
// ---------------------------------------------------------------------------

/**
 * Load active featured content filtered by media type, ordered by sort_order.
 */
export async function getFeaturedContentByType(
  mediaType: "movie" | "tv" | "anime",
): Promise<CmsFeaturedItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("featured_content")
    .select("*")
    .eq("media_type", mediaType)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    mediaType: r.media_type as string,
    mediaId: r.media_id as string,
    label: (r.label as string) ?? null,
    sortOrder: (r.sort_order as number) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Editorial Collections
// ---------------------------------------------------------------------------

/**
 * Load published editorial collections with item counts, ordered by sort_order.
 */
export async function getPublishedEditorialCollections(): Promise<CmsEditorialCollection[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("editorial_collections")
    .select(`
      id, title, slug, description, cover_image_url, media_type, sort_order,
      editorial_collection_items(count)
    `)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    slug: r.slug as string,
    description: (r.description as string) ?? null,
    coverImageUrl: (r.cover_image_url as string) ?? null,
    mediaType: (r.media_type as string) ?? null,
    itemCount: ((r.editorial_collection_items as Array<Record<string, unknown>>)?.[0]?.count as number) ?? 0,
    sortOrder: (r.sort_order as number) ?? 0,
  }));
}

/**
 * Load items for a specific editorial collection.
 */
export async function getEditorialCollectionItems(
  collectionId: string,
): Promise<CmsEditorialCollectionItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("editorial_collection_items")
    .select("*")
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: true });

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    mediaType: r.media_type as string,
    mediaId: r.media_id as string,
    note: (r.note as string) ?? null,
    sortOrder: (r.sort_order as number) ?? 0,
  }));
}

/**
 * Get a single published editorial collection by ID.
 */
export async function getPublishedEditorialCollection(
  id: string,
): Promise<CmsEditorialCollection | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("editorial_collections")
    .select(`
      id, title, slug, description, cover_image_url, media_type, sort_order,
      editorial_collection_items(count)
    `)
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!data) return null;

  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    title: r.title as string,
    slug: r.slug as string,
    description: (r.description as string) ?? null,
    coverImageUrl: (r.cover_image_url as string) ?? null,
    mediaType: (r.media_type as string) ?? null,
    itemCount: ((r.editorial_collection_items as Array<Record<string, unknown>>)?.[0]?.count as number) ?? 0,
    sortOrder: (r.sort_order as number) ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Homepage Sections
// ---------------------------------------------------------------------------

/**
 * Load homepage section visibility settings.
 */
export async function getHomepageSections(): Promise<CmsHomepageSection[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("homepage_sections")
    .select("id, section_key, is_enabled");

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    sectionKey: r.section_key as string,
    isEnabled: (r.is_enabled as boolean) ?? true,
  }));
}