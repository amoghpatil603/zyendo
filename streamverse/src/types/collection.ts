/**
 * Custom Collections types.
 *
 * The `collections` and `collection_items` tables exist in
 * supabase/migrations/0001_init.sql with extra columns added in
 * 0003_collections_extra_cols.sql.
 *
 * RLS: collections are readable by anyone when is_public = true,
 * otherwise only by the owner. Writes are owner-only.
 * See 0002_rls.sql for the full policy set.
 */

/** Camel-case domain shape used by UI and business-logic layers. */
export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  /** Derived from a count of collection_items rows — not a real column. */
  itemCount: number;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  mediaType: string;
  mediaId: string;
  addedAt: string;
  sortOrder: number;
}

/** Raw snake_case row returned by Supabase for `collections`. */
export interface CollectionRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  created_at: string;
}

/** Raw snake_case row returned by Supabase for `collection_items`. */
export interface CollectionItemRow {
  id: string;
  collection_id: string;
  media_type: string;
  media_id: string;
  added_at: string;
  sort_order: number;
}

/** Used by the "add to collection" picker: which collections contain a given item. */
export interface CollectionMembership {
  collectionId: string;
  name: string;
  inCollection: boolean;
}
