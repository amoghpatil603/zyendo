/**
 * Reviews & Ratings types.
 *
 * The `reviews` table already exists in Supabase
 * (see supabase/migrations/0001_init.sql and 0002_rls.sql).
 * RLS allows public read, owner-only write/update/delete.
 */

export interface Review {
  id: string;
  userId: string;
  mediaType: string;
  mediaId: string;
  /** 1–10 scale per the DB schema. */
  rating: number;
  body: string;
  createdAt: string;
}

export interface ReviewWithUser extends Review {
  userDisplayName?: string;
  userAvatarUrl?: string;
}

export interface ReviewRow {
  id: string;
  user_id: string;
  media_type: string;
  media_id: string;
  rating: number;
  body: string;
  created_at: string;
}

export interface ReviewsStats {
  averageRating: number | null;
  reviewCount: number;
}
