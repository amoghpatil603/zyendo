"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { PublicProfile, UserSearchResult, ReviewWithInteraction, CollectionWithInteraction, ReviewComment, SocialActivity } from "@/types/social";

// ---------------------------------------------------------------------------
// PUBLIC PROFILE
// ---------------------------------------------------------------------------

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  try {
    const [profileResp, followersResp, followingResp, reviewsResp, collectionsResp, watchlistResp, achievementsResp, dnaResp, activityResp] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
      supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("collections").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("watchlist").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("user_achievements").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("entertainment_dna").select("genre_weights").eq("user_id", userId).maybeSingle(),
      supabase.from("user_activity").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    ]);

    const profile = profileResp.data;
    if (!profile) return null;

    // Check if current user follows this profile
    let isFollowing = false;
    if (currentUser && currentUser.id !== userId) {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", userId)
        .maybeSingle();
      isFollowing = !!followData;
    }

    // Parse DNA genres
    const genreWeights = dnaResp.data?.genre_weights as Array<{ name: string; weight: number }> | null ?? [];

    return {
      id: profile.id,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      bio: null,
      publicSlug: profile.public_slug,
      createdAt: profile.created_at,
      followerCount: followersResp.count ?? 0,
      followingCount: followingResp.count ?? 0,
      isFollowing,
      isOwnProfile: currentUser?.id === userId,
      stats: {
        reviewsCount: reviewsResp.count ?? 0,
        collectionsCount: collectionsResp.count ?? 0,
        watchlistCount: watchlistResp.count ?? 0,
        achievementsCount: achievementsResp.count ?? 0,
      },
      topGenres: genreWeights.slice(0, 5),
      recentActivity: (activityResp.data ?? []).map((a) => ({
        id: a.id,
        userId: a.user_id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        activityType: a.activity_type,
        mediaType: a.media_type,
        mediaId: a.media_id,
        metadata: a.metadata as Record<string, unknown> | null,
        createdAt: a.created_at,
      })),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// FOLLOW / UNFOLLOW
// ---------------------------------------------------------------------------

export async function followUser(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  if (user.id === userId) return { ok: false, error: "Cannot follow yourself." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unfollowUser(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// REVIEW LIKES
// ---------------------------------------------------------------------------

export async function likeReview(reviewId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("review_likes").insert({ review_id: reviewId, user_id: user.id });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unlikeReview(reviewId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("review_likes").delete().eq("review_id", reviewId).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// COLLECTION LIKES
// ---------------------------------------------------------------------------

export async function likeCollection(collectionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("collection_likes").insert({ collection_id: collectionId, user_id: user.id });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unlikeCollection(collectionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("collection_likes").delete().eq("collection_id", collectionId).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// REVIEW COMMENTS
// ---------------------------------------------------------------------------

export async function addComment(reviewId: string, body: string, parentId?: string): Promise<{ ok: true; comment: ReviewComment } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  if (!body.trim()) return { ok: false, error: "Comment cannot be empty." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("review_comments").insert({
    review_id: reviewId, user_id: user.id, body: body.trim(), parent_id: parentId ?? null,
  }).select("id, review_id, user_id, body, parent_id, created_at").single();
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    comment: {
      id: data.id, reviewId: data.review_id, userId: data.user_id,
      userName: user.email?.split("@")[0] ?? "User", userAvatarUrl: null,
      body: data.body, parentId: data.parent_id, createdAt: data.created_at,
    },
  };
}

// ---------------------------------------------------------------------------
// USER REVIEWS WITH INTERACTION DATA
// ---------------------------------------------------------------------------

export async function getUserReviewsWithInteraction(
  userId: string,
  limit = 20
): Promise<ReviewWithInteraction[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  try {
    // Get user's profile for display
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    // Get reviews
    const { data: reviews } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!reviews || reviews.length === 0) return [];

    const reviewIds = reviews.map((r) => r.id);

    // Get like counts for all reviews
    const { data: likeCounts } = await supabase
      .from("review_likes")
      .select("review_id")
      .in("review_id", reviewIds);

    // Get current user's likes
    let userLikes = new Set<string>();
    if (currentUser) {
      const { data: myLikes } = await supabase
        .from("review_likes")
        .select("review_id")
        .in("review_id", reviewIds)
        .eq("user_id", currentUser.id);
      if (myLikes) {
        userLikes = new Set(myLikes.map((l) => l.review_id));
      }
    }

    // Get comment counts
    const { data: commentCounts } = await supabase
      .from("review_comments")
      .select("review_id")
      .in("review_id", reviewIds);

    const likeCountMap = new Map<string, number>();
    if (likeCounts) {
      for (const l of likeCounts) {
        likeCountMap.set(l.review_id, (likeCountMap.get(l.review_id) ?? 0) + 1);
      }
    }

    const commentCountMap = new Map<string, number>();
    if (commentCounts) {
      for (const c of commentCounts) {
        commentCountMap.set(c.review_id, (commentCountMap.get(c.review_id) ?? 0) + 1);
      }
    }

    return reviews.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: profile?.display_name ?? null,
      userAvatarUrl: profile?.avatar_url ?? null,
      mediaType: r.media_type,
      mediaId: r.media_id,
      rating: r.rating,
      body: r.body,
      createdAt: r.created_at,
      likeCount: likeCountMap.get(r.id) ?? 0,
      commentCount: commentCountMap.get(r.id) ?? 0,
      isLiked: userLikes.has(r.id),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// USER COLLECTIONS WITH INTERACTION DATA
// ---------------------------------------------------------------------------

export async function getUserCollectionsWithInteraction(
  userId: string,
  limit = 20
): Promise<CollectionWithInteraction[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  try {
    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    // Get public collections for this user
    const { data: collections } = await supabase
      .from("collections")
      .select("id, user_id, name, description, created_at, is_public")
      .eq("user_id", userId)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!collections || collections.length === 0) return [];

    const collectionIds = collections.map((c) => c.id);

    // Get item counts
    const { data: itemCounts } = await supabase
      .from("collection_items")
      .select("collection_id")
      .in("collection_id", collectionIds);

    // Get like counts
    const { data: likeCounts } = await supabase
      .from("collection_likes")
      .select("collection_id")
      .in("collection_id", collectionIds);

    // Get current user's likes
    let userLikes = new Set<string>();
    if (currentUser) {
      const { data: myLikes } = await supabase
        .from("collection_likes")
        .select("collection_id")
        .in("collection_id", collectionIds)
        .eq("user_id", currentUser.id);
      if (myLikes) {
        userLikes = new Set(myLikes.map((l) => l.collection_id));
      }
    }

    const itemCountMap = new Map<string, number>();
    if (itemCounts) {
      for (const i of itemCounts) {
        itemCountMap.set(i.collection_id, (itemCountMap.get(i.collection_id) ?? 0) + 1);
      }
    }

    const likeCountMap = new Map<string, number>();
    if (likeCounts) {
      for (const l of likeCounts) {
        likeCountMap.set(l.collection_id, (likeCountMap.get(l.collection_id) ?? 0) + 1);
      }
    }

    return collections.map((c) => ({
      id: c.id,
      userId: c.user_id,
      userName: profile?.display_name ?? null,
      name: c.name,
      description: c.description,
      itemCount: itemCountMap.get(c.id) ?? 0,
      likeCount: likeCountMap.get(c.id) ?? 0,
      isLiked: userLikes.has(c.id),
      createdAt: c.created_at,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// COMMENTS FOR A REVIEW
// ---------------------------------------------------------------------------

export async function getCommentsForReview(reviewId: string): Promise<ReviewComment[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();

  try {
    const { data: comments } = await supabase
      .from("review_comments")
      .select("id, review_id, user_id, body, parent_id, created_at")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true });

    if (!comments || comments.length === 0) return [];

    // Get user display names/avatars
    const userIds = [...new Set(comments.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
      }
    }

    const mapped = comments.map((c) => {
      const p = profileMap.get(c.user_id);
      return {
        id: c.id,
        reviewId: c.review_id,
        userId: c.user_id,
        userName: p?.display_name ?? null,
        userAvatarUrl: p?.avatar_url ?? null,
        body: c.body,
        parentId: c.parent_id,
        createdAt: c.created_at,
      };
    });

    // Build tree: attach replies to parents
    const commentMap = new Map<string, ReviewComment>();
    const roots: ReviewComment[] = [];

    for (const c of mapped) {
      commentMap.set(c.id, { ...c, replies: [] });
    }

    for (const c of mapped) {
      if (c.parentId && commentMap.has(c.parentId)) {
        const parent = commentMap.get(c.parentId)!;
        const child = commentMap.get(c.id)!;
        if (!parent.replies) parent.replies = [];
        parent.replies.push(child);
      } else if (!c.parentId) {
        roots.push(commentMap.get(c.id)!);
      }
    }

    return roots;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// TRENDING USERS
// ---------------------------------------------------------------------------

export async function getTrendingUsers(limit = 10): Promise<UserSearchResult[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();

  try {
    // Get users with most followers
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id, id")
      .limit(1000);

    if (!follows) return [];

    // Count followers per user
    const followerCountMap = new Map<string, number>();
    for (const f of follows) {
      followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) ?? 0) + 1);
    }

    // Sort by follower count, get top N
    const topUserIds = [...followerCountMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (topUserIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, public_slug, created_at")
      .in("id", topUserIds);

    if (!profiles) return [];

    // Get counts
    const { data: collectionCounts } = await supabase
      .from("collections")
      .select("user_id")
      .in("user_id", topUserIds);

    const { data: reviewCounts } = await supabase
      .from("reviews")
      .select("user_id")
      .in("user_id", topUserIds);

    const collectionCountMap = new Map<string, number>();
    if (collectionCounts) {
      for (const c of collectionCounts) {
        collectionCountMap.set(c.user_id, (collectionCountMap.get(c.user_id) ?? 0) + 1);
      }
    }

    const reviewCountMap = new Map<string, number>();
    if (reviewCounts) {
      for (const r of reviewCounts) {
        reviewCountMap.set(r.user_id, (reviewCountMap.get(r.user_id) ?? 0) + 1);
      }
    }

    return profiles.map((p) => ({
      id: p.id,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      publicSlug: p.public_slug,
      createdAt: p.created_at,
      collectionCount: collectionCountMap.get(p.id) ?? 0,
      reviewCount: reviewCountMap.get(p.id) ?? 0,
      followerCount: followerCountMap.get(p.id) ?? 0,
    })).sort((a, b) => b.followerCount - a.followerCount);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// USER SEARCH
// ---------------------------------------------------------------------------

export async function searchUsers(query: string, limit = 20): Promise<UserSearchResult[]> {
  if (!isSupabaseConfigured() || !query.trim()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, public_slug, created_at")
    .ilike("display_name", `%${query.trim()}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!data) return [];

  const userIds = data.map((p) => p.id);

  // Get follower counts
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .in("following_id", userIds);

  const followerCountMap = new Map<string, number>();
  if (follows) {
    for (const f of follows) {
      followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) ?? 0) + 1);
    }
  }

  // Get collection counts
  const { data: collectionCounts } = await supabase
    .from("collections")
    .select("user_id")
    .in("user_id", userIds);

  const collectionCountMap = new Map<string, number>();
  if (collectionCounts) {
    for (const c of collectionCounts) {
      collectionCountMap.set(c.user_id, (collectionCountMap.get(c.user_id) ?? 0) + 1);
    }
  }

  // Get review counts
  const { data: reviewCounts } = await supabase
    .from("reviews")
    .select("user_id")
    .in("user_id", userIds);

  const reviewCountMap = new Map<string, number>();
  if (reviewCounts) {
    for (const r of reviewCounts) {
      reviewCountMap.set(r.user_id, (reviewCountMap.get(r.user_id) ?? 0) + 1);
    }
  }

  return data.map((p) => ({
    id: p.id,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    publicSlug: p.public_slug,
    createdAt: p.created_at,
    collectionCount: collectionCountMap.get(p.id) ?? 0,
    reviewCount: reviewCountMap.get(p.id) ?? 0,
    followerCount: followerCountMap.get(p.id) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// POPULAR COLLECTIONS
// ---------------------------------------------------------------------------

export async function getPopularCollections(limit = 5): Promise<CollectionWithInteraction[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  try {
    // Get public collections with most likes
    const { data: collections } = await supabase
      .from("collections")
      .select("id, user_id, name, description, created_at, is_public")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit * 3);

    if (!collections || collections.length === 0) return [];

    const collectionIds = collections.map((c) => c.id);

    // Get like counts
    const { data: likeCounts } = await supabase
      .from("collection_likes")
      .select("collection_id")
      .in("collection_id", collectionIds);

    const likeCountMap = new Map<string, number>();
    if (likeCounts) {
      for (const l of likeCounts) {
        likeCountMap.set(l.collection_id, (likeCountMap.get(l.collection_id) ?? 0) + 1);
      }
    }

    // Sort by like count, get top N
    const sorted = [...collections]
      .sort((a, b) => (likeCountMap.get(b.id) ?? 0) - (likeCountMap.get(a.id) ?? 0))
      .slice(0, limit);

    // Get item counts
    const { data: itemCounts } = await supabase
      .from("collection_items")
      .select("collection_id")
      .in("collection_id", sorted.map((c) => c.id));

    const itemCountMap = new Map<string, number>();
    if (itemCounts) {
      for (const i of itemCounts) {
        itemCountMap.set(i.collection_id, (itemCountMap.get(i.collection_id) ?? 0) + 1);
      }
    }

    // Get user names
    const userIds = [...new Set(sorted.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    const profileMap = new Map<string, string | null>();
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.id, p.display_name);
      }
    }

    // Get current user's likes
    let userLikes = new Set<string>();
    if (currentUser) {
      const { data: myLikes } = await supabase
        .from("collection_likes")
        .select("collection_id")
        .in("collection_id", sorted.map((c) => c.id))
        .eq("user_id", currentUser.id);
      if (myLikes) {
        userLikes = new Set(myLikes.map((l) => l.collection_id));
      }
    }

    return sorted.map((c) => ({
      id: c.id,
      userId: c.user_id,
      userName: profileMap.get(c.user_id) ?? null,
      name: c.name,
      description: c.description,
      itemCount: itemCountMap.get(c.id) ?? 0,
      likeCount: likeCountMap.get(c.id) ?? 0,
      isLiked: userLikes.has(c.id),
      createdAt: c.created_at,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// SOCIAL FEED
// ---------------------------------------------------------------------------

export async function getSocialFeed(limit = 30): Promise<SocialActivity[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("social_activity")
    .select("*")
    .limit(limit);
  if (!data) return [];
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    userId: r.user_id as string,
    displayName: r.display_name as string | null,
    avatarUrl: r.avatar_url as string | null,
    activityType: r.activity_type as string,
    mediaType: r.media_type as string | null,
    mediaId: r.media_id as string | null,
    metadata: r.metadata as Record<string, unknown> | null,
    createdAt: r.created_at as string,
  }));
}
