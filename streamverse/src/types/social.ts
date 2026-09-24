/** Social platform V2-1 types */

export interface PublicProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  publicSlug: string | null;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  stats: {
    reviewsCount: number;
    collectionsCount: number;
    watchlistCount: number;
    achievementsCount: number;
  };
  topGenres: { name: string; weight: number }[];
  recentActivity: SocialActivity[];
}

export interface SocialActivity {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  activityType: string;
  mediaType: string | null;
  mediaId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface UserSearchResult {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  publicSlug: string | null;
  createdAt: string;
  collectionCount: number;
  reviewCount: number;
  followerCount: number;
}

export interface ReviewWithInteraction {
  id: string;
  userId: string;
  userName: string | null;
  userAvatarUrl: string | null;
  mediaType: string;
  mediaId: string;
  rating: number;
  body: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export interface CollectionWithInteraction {
  id: string;
  userId: string;
  userName: string | null;
  name: string;
  description: string | null;
  itemCount: number;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface ReviewComment {
  id: string;
  reviewId: string;
  userId: string;
  userName: string | null;
  userAvatarUrl: string | null;
  body: string;
  parentId: string | null;
  createdAt: string;
  replies?: ReviewComment[];
}
