/** Admin platform types. */

export type AdminRole = "admin" | "moderator" | "viewer";
export type UserStatus = "active" | "suspended" | "banned";

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: AdminRole;
  status: UserStatus;
  createdAt: string;
  lastSignInAt: string | null;
  reviewsCount: number;
  collectionsCount: number;
  watchQueueCount: number;
}

export interface AdminUserDetail extends AdminUser {
  bio: string | null;
  achievements: { id: string; name: string; unlockedAt: string }[];
  dnaSummary: { genres: number; lastComputed: string | null } | null;
  recentActivity: { type: string; description: string; timestamp: string }[];
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  dailySignups: number;
  moviesReviewed: number;
  collectionsCreated: number;
  aiConversations: number;
  watchQueueItems: number;
  dailyActiveUsers: number;
  newUsersToday: number;
  totalReviews: number;
  totalAiPicksGenerated: number;
  watchTogetherSessions: number;
}

export interface AdminRecentActivity {
  id: string;
  type: "user_joined" | "review_created" | "collection_created" | "content_reported" | "ai_conversation" | "system_event";
  description: string;
  user: string | null;
  timestamp: string;
  href?: string;
}

export interface AdminQuickAction {
  label: string;
  href: string;
  icon: string;
  description: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: AdminRole;
  status: UserStatus;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface AdminRoleRow {
  user_id: string;
  role: AdminRole;
}

export interface AdminUserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  adminCount: number;
  moderatorCount: number;
  suspendedUsers: number;
}

export interface AdminUsersSearch {
  query: string;
  role: AdminRole | "";
  status: UserStatus | "";
  sort: "newest" | "oldest" | "most_active" | "most_reviews" | "most_collections";
  page: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
