"use server";

import { cache } from "react";
import { isTmdbConfigured } from "@/lib/env";
import {
  getActiveHeroBanners,
  getFeaturedContentByType,
  getPublishedEditorialCollections,
  getPublishedEditorialCollection,
  getEditorialCollectionItems,
  type CmsHeroBanner,
  type CmsFeaturedItem,
  type CmsEditorialCollection,
  type CmsEditorialCollectionItem,
} from "./cms-read";
import type { MediaItem } from "@/types/media-item";

// ---------------------------------------------------------------------------
// TMDB Resolution with Deduplication
// ---------------------------------------------------------------------------

/**
 * Cache for resolved TMDB media items.
 * Key: `${mediaType}:${tmdbId}` to deduplicate across multiple CMS items.
 */
const resolvedMediaCache = cache(async (key: string): Promise<MediaItem | null> => {
  if (!isTmdbConfigured()) return null;

  const [mediaType, tmdbId] = key.split(":");
  if (!mediaType || !tmdbId) return null;

  // Import TMDB functions dynamically to avoid bundling in client
  const { getMovieDetail, getTvDetail } = await import("@/lib/adapters/tmdb");

  try {
    if (mediaType === "movie") {
      return await getMovieDetail(tmdbId);
    } else if (mediaType === "tv" || mediaType === "anime") {
      return await getTvDetail(tmdbId);
    }
  } catch (error) {
    console.error(`[CMS] Failed to resolve ${mediaType}:${tmdbId}`, error);
  }
  return null;
});

/**
 * Resolve a single CMS featured item to a MediaItem.
 * Uses caching to avoid duplicate TMDB calls for the same media.
 */
export async function resolveFeaturedItem(
  item: CmsFeaturedItem,
): Promise<MediaItem | null> {
  const key = `${item.mediaType}:${item.mediaId}`;
  return resolvedMediaCache(key);
}

/**
 * Resolve multiple featured items in parallel with deduplication.
 */
export async function resolveFeaturedItems(
  items: CmsFeaturedItem[],
): Promise<MediaItem[]> {
  const results = await Promise.all(
    items.map((item) => resolveFeaturedItem(item)),
  );
  return results.filter((item): item is MediaItem => item !== null);
}

// ---------------------------------------------------------------------------
// Hero Banners
// ---------------------------------------------------------------------------

export interface ResolvedHeroBanner {
  id: string;
  title: string;
  subtitle: string | null;
  backdropUrl: string | null;
  overlayColor: string;
  ctaLabel: string;
  ctaHref: string | null;
  sortOrder: number;
  media: MediaItem | null;
}

/**
 * Load and resolve active hero banners.
 * Returns empty array if no active banners or on error.
 */
export async function getResolvedHeroBanners(): Promise<ResolvedHeroBanner[]> {
  try {
    const banners = await getActiveHeroBanners();
    if (banners.length === 0) return [];

    // Resolve media for each banner in parallel
    const resolved = await Promise.all(
      banners.map(async (banner) => {
        let media: MediaItem | null = null;
        if (banner.mediaType && banner.mediaId) {
          media = await resolveFeaturedItem({
            id: banner.id,
            mediaType: banner.mediaType,
            mediaId: banner.mediaId,
            label: null,
            sortOrder: 0,
          });
        }
        return {
          id: banner.id,
          title: banner.title,
          subtitle: banner.subtitle,
          backdropUrl: banner.backdropUrl,
          overlayColor: banner.overlayColor,
          ctaLabel: banner.ctaLabel,
          ctaHref: banner.ctaHref,
          sortOrder: banner.sortOrder,
          media,
        };
      }),
    );

    return resolved;
  } catch (error) {
    console.error("[CMS] Failed to load hero banners:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Featured Content
// ---------------------------------------------------------------------------

export interface ResolvedFeaturedContent {
  movies: MediaItem[];
  tv: MediaItem[];
  anime: MediaItem[];
}

/**
 * Load and resolve all featured content by type.
 * Returns empty arrays for each type if no content or on error.
 */
export async function getResolvedFeaturedContent(): Promise<ResolvedFeaturedContent> {
  try {
    const [moviesRaw, tvRaw, animeRaw] = await Promise.all([
      getFeaturedContentByType("movie"),
      getFeaturedContentByType("tv"),
      getFeaturedContentByType("anime"),
    ]);

    // Resolve in parallel, preserving admin sort order
    const [movies, tv, anime] = await Promise.all([
      resolveFeaturedItems(moviesRaw),
      resolveFeaturedItems(tvRaw),
      resolveFeaturedItems(animeRaw),
    ]);

    return { movies, tv, anime };
  } catch (error) {
    console.error("[CMS] Failed to load featured content:", error);
    return { movies: [], tv: [], anime: [] };
  }
}

// ---------------------------------------------------------------------------
// Editorial Collections
// ---------------------------------------------------------------------------

export interface ResolvedEditorialCollectionItem {
  id: string;
  mediaType: string;
  mediaId: string;
  note: string | null;
  sortOrder: number;
  media: MediaItem | null;
}

export interface ResolvedEditorialCollection extends CmsEditorialCollection {
  items: ResolvedEditorialCollectionItem[];
}

/**
 * Load and resolve a single editorial collection with its items.
 */
export async function getResolvedEditorialCollection(
  collectionId: string,
): Promise<ResolvedEditorialCollection | null> {
  try {
    const collection = await getPublishedEditorialCollection(collectionId);
    if (!collection) return null;

    const itemsRaw = await getEditorialCollectionItems(collectionId);

    // Resolve items in parallel, preserving admin sort order
    const items = await Promise.all(
      itemsRaw.map(async (item) => ({
        ...item,
        media: await resolveFeaturedItem({
          id: item.id,
          mediaType: item.mediaType,
          mediaId: item.mediaId,
          label: null,
          sortOrder: 0,
        }),
      })),
    );

    return { ...collection, items };
  } catch (error) {
    console.error(`[CMS] Failed to load editorial collection ${collectionId}:`, error);
    return null;
  }
}

/**
 * Load and resolve all published editorial collections.
 * Returns empty array if no collections or on error.
 */
export async function getResolvedEditorialCollections(): Promise<
  ResolvedEditorialCollection[]
> {
  try {
    const collections = await getPublishedEditorialCollections();
    if (collections.length === 0) return [];

    // Load items for each collection in parallel
    const resolved = await Promise.all(
      collections.map(async (collection) => {
        const itemsRaw = await getEditorialCollectionItems(collection.id);

        // Resolve items in parallel, preserving admin sort order
        const items = await Promise.all(
          itemsRaw.map(async (item) => ({
            ...item,
            media: await resolveFeaturedItem({
              id: item.id,
              mediaType: item.mediaType,
              mediaId: item.mediaId,
              label: null,
              sortOrder: 0,
            }),
          })),
        );

        return { ...collection, items };
      }),
    );

    return resolved;
  } catch (error) {
    console.error("[CMS] Failed to load editorial collections:", error);
    return [];
  }
}