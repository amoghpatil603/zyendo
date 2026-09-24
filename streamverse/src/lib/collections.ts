import "server-only";

import type { MediaItem } from "@/types/media-item";
import type {
  Collection,
  CollectionItem,
  CollectionItemRow,
  CollectionMembership,
  CollectionRow,
} from "@/types/collection";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getMediaDetail } from "@/lib/adapters/registry";

// ---------------------------------------------------------------------------
// Pure mapping helpers (also exported for unit-testing)
// ---------------------------------------------------------------------------

export function mapCollectionRow(
  row: CollectionRow & { collection_items?: { count: number }[] },
  itemCount = 0,
): Collection {
  const count =
    Array.isArray(row.collection_items) && row.collection_items.length > 0
      ? (row.collection_items[0].count ?? 0)
      : itemCount;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? null,
    coverImageUrl: row.cover_image_url ?? null,
    isPublic: row.is_public,
    createdAt: row.created_at,
    itemCount: count,
  };
}

export function mapCollectionItemRow(row: CollectionItemRow): CollectionItem {
  return {
    id: row.id,
    collectionId: row.collection_id,
    mediaType: row.media_type,
    mediaId: row.media_id,
    addedAt: row.added_at,
    sortOrder: row.sort_order ?? 0,
  };
}

/** Stable cache key for a media item's presence in a collection. */
export function buildCollectionItemKey(
  mediaType: string,
  mediaId: string,
): string {
  return `${mediaType}:${mediaId}`;
}

// ---------------------------------------------------------------------------
// CRUD — Collections
// ---------------------------------------------------------------------------

/**
 * Returns all collections owned by the current user, sorted newest-first,
 * with the item count populated via a sub-select aggregate.
 */
export async function getCollectionsForUser(): Promise<Collection[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("collections")
    .select(
      `id, user_id, name, description, cover_image_url, is_public, created_at,
       collection_items(count)`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as Array<CollectionRow & { collection_items: { count: number }[] }>).map(
    (row) => mapCollectionRow(row),
  );
}

/**
 * Returns a single collection (respecting RLS — public or owned) together with
 * its ordered items. Returns null when not found or access is denied.
 */
export async function getCollectionWithItems(collectionId: string): Promise<{
  collection: Collection;
  items: CollectionItem[];
} | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();

  const { data: collRow, error: collError } = await supabase
    .from("collections")
    .select("id, user_id, name, description, cover_image_url, is_public, created_at")
    .eq("id", collectionId)
    .maybeSingle();

  if (collError || !collRow) return null;

  const { data: itemRows, error: itemError } = await supabase
    .from("collection_items")
    .select("id, collection_id, media_type, media_id, added_at, sort_order")
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: true })
    .order("added_at", { ascending: false });

  if (itemError) {
    const { data: fallbackRows, error: fallbackError } = await supabase
      .from("collection_items")
      .select("id, collection_id, media_type, media_id, added_at")
      .eq("collection_id", collectionId)
      .order("added_at", { ascending: false });
    if (fallbackError || !fallbackRows) return null;
    const fallbackItems = fallbackRows.map((row) => ({
      id: row.id,
      collectionId: row.collection_id,
      mediaType: row.media_type,
      mediaId: row.media_id,
      addedAt: row.added_at,
      sortOrder: 0,
    }));
    return {
      collection: mapCollectionRow(collRow as CollectionRow & { collection_items?: { count: number }[] }, fallbackRows.length),
      items: fallbackItems,
    };
  }

  const items = ((itemRows ?? []) as CollectionItemRow[]).map(
    mapCollectionItemRow,
  );

  return {
    collection: mapCollectionRow(collRow as CollectionRow & { collection_items?: { count: number }[] }, items.length),
    items,
  };
}

/**
 * Create a new collection.
 */
export async function createCollection(input: {
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  isPublic?: boolean;
}): Promise<Collection | null> {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description ?? null,
      cover_image_url: input.coverImageUrl ?? null,
      is_public: input.isPublic ?? false,
    })
    .select()
    .single();

  if (error || !data) return null;

  return mapCollectionRow(data as CollectionRow & { collection_items?: { count: number }[] });
}

/**
 * Update an existing collection.
 */
export async function updateCollection(
  collectionId: string,
  input: {
    name?: string;
    description?: string | null;
    coverImageUrl?: string | null;
    isPublic?: boolean;
  },
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.coverImageUrl !== undefined) updates.cover_image_url = input.coverImageUrl;
  if (input.isPublic !== undefined) updates.is_public = input.isPublic;

  const { error } = await supabase
    .from("collections")
    .update(updates)
    .eq("id", collectionId)
    .eq("user_id", user.id);

  return !error;
}

/**
 * Delete a collection and all its items (cascade).
 */
export async function deleteCollection(collectionId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", user.id);

  return !error;
}

// ---------------------------------------------------------------------------
// COLLECTION ITEMS
// ---------------------------------------------------------------------------

/**
 * Add an item to a collection.
 */
export async function addItemToCollection(input: {
  collectionId: string;
  mediaType: string;
  mediaId: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  // Get the next sort order; fall back to 0 if the column is unavailable.
  let nextSortOrder = 0;
  try {
    const { data: maxItem } = await supabase
      .from("collection_items")
      .select("sort_order")
      .eq("collection_id", input.collectionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    nextSortOrder = (maxItem?.sort_order ?? -1) + 1;
  } catch {
    // Column may not exist yet; default to appending at the end.
    nextSortOrder = 0;
  }

  const { error } = await supabase.from("collection_items").insert({
    collection_id: input.collectionId,
    media_type: input.mediaType,
    media_id: input.mediaId,
    sort_order: nextSortOrder,
  });

  if (error) {
    // A duplicate (unique-constraint violation) is an idempotent no-op,
    // not a failure: adding an item that is already present is a success.
    if (error.code === "23505") return true;
    return false;
  }

  return true;
}

/**
 * Remove an item from a collection.
 */
export async function removeItemFromCollection(itemId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("id", itemId);

  return !error;
}

/**
 * Reorder items in a collection (drag & drop).
 * Accepts an array of item IDs in the new order.
 */
export async function reorderCollectionItems(
  collectionId: string,
  itemIds: string[],
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  const updates = itemIds.map((id, index) => ({
    id,
    collection_id: collectionId,
    sort_order: index,
  }));

  const { error } = await supabase.from("collection_items").upsert(
    updates.map((u) => ({
      id: u.id,
      sort_order: u.sort_order,
    })),
    { onConflict: "id" },
  );

  return !error;
}

/**
 * Check if a media item is already in a collection.
 */
export async function isItemInCollection(
  collectionId: string,
  mediaType: string,
  mediaId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("collection_items")
    .select("id")
    .eq("collection_id", collectionId)
    .eq("media_type", mediaType)
    .eq("media_id", mediaId)
    .maybeSingle();

  return !!data;
}

// ---------------------------------------------------------------------------
// HYDRATION
// ---------------------------------------------------------------------------

/**
 * Hydrates a list of CollectionItems into full MediaItems via the adapter
 * layer (identical strategy to getWatchlistItems).
 */
export async function hydrateCollectionItems(
  items: CollectionItem[],
): Promise<MediaItem[]> {
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        return (await getMediaDetail(item.mediaType, item.mediaId)) as MediaItem | null;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((item): item is MediaItem => item !== null);
}

// ---------------------------------------------------------------------------
// MEMBERSHIPS (for "Add to Collection" picker)
// ---------------------------------------------------------------------------

/**
 * For a given media item, returns which of the current user's collections
 * contain it (used by the "Add to Collection" picker).
 */
export async function getCollectionMembershipsForMedia(
  mediaType: string,
  mediaId: string,
): Promise<CollectionMembership[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!collections || collections.length === 0) return [];

  const collectionIds = collections.map((c) => c.id as string);

  const { data: items } = await supabase
    .from("collection_items")
    .select("collection_id")
    .in("collection_id", collectionIds)
    .eq("media_type", mediaType)
    .eq("media_id", mediaId);

  const inSet = new Set((items ?? []).map((r) => r.collection_id as string));

  return collections.map((c) => ({
    collectionId: c.id as string,
    name: c.name as string,
    inCollection: inSet.has(c.id as string),
  }));
}

/**
 * Toggle an item in a collection (add if not present, remove if present).
 */
export async function toggleCollectionItem(input: {
  collectionId: string;
  mediaType: string;
  mediaId: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();

  // Check if already in collection
  const { data: existing } = await supabase
    .from("collection_items")
    .select("id")
    .eq("collection_id", input.collectionId)
    .eq("media_type", input.mediaType)
    .eq("media_id", input.mediaId)
    .maybeSingle();

  if (existing) {
    // Remove
    const { error } = await supabase
      .from("collection_items")
      .delete()
      .eq("id", existing.id);
    return !error;
  } else {
    // Add
    return addItemToCollection(input);
  }
}