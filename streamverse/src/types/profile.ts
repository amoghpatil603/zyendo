/**
 * Phase 2 — Personal Experience types.
 *
 * Covers Profile Dashboard, Watch History, Achievements, Monthly Goals,
 * Watch Streaks, User Stats, and Activity Feed.
 */

// ===========================================================================
// WATCH HISTORY
// ===========================================================================

export interface WatchHistoryEntry {
  id: string;
  userId: string;
  mediaType: string;
  mediaId: string;
  title: string;
  coverImageUrl: string | null;
  watchedAt: string;
  durationMinutes: number | null;
  rating: number | null;
}

export interface WatchHistoryRow {
  id: string;
  user_id: string;
  media_type: string;
  media_id: string;
  title: string;
  cover_image_url: string | null;
  watched_at: string;
  duration_minutes: number | null;
  rating: number | null;
}

export interface WatchHistoryGroup {
  date: string;
  label: string;
  entries: WatchHistoryEntry[];
}

// ===========================================================================
// ACHIEVEMENTS
// ===========================================================================

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
  category: "milestone" | "genre" | "social" | "streak" | "special";
  requirementType: string;
  requirementValue: number;
}

export interface AchievementRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url: string | null;
  category: "milestone" | "genre" | "social" | "streak" | "special";
  requirement_type: string;
  requirement_value: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  achievement?: Achievement;
}

export interface UserAchievementRow {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

// ===========================================================================
// MONTHLY GOALS
// ===========================================================================

export type GoalType =
  | "movies_watched"
  | "episodes_watched"
  | "shows_completed"
  | "genre_watch"
  | "hours_watched";

export interface MonthlyGoal {
  id: string;
  userId: string;
  goalType: GoalType;
  targetValue: number;
  currentValue: number;
  metadata: Record<string, unknown> | null;
  month: number;
  year: number;
  completed: boolean;
}

export interface MonthlyGoalRow {
  id: string;
  user_id: string;
  goal_type: GoalType;
  target_value: number;
  current_value: number;
  metadata: Record<string, unknown> | null;
  month: number;
  year: number;
  completed: boolean;
}

// ===========================================================================
// WATCH STREAKS
// ===========================================================================

export interface WatchStreak {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastWatchDate: string | null;
}

export interface WatchStreakRow {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_watch_date: string | null;
}

// ===========================================================================
// USER STATS
// ===========================================================================

export interface UserStats {
  userId: string;
  totalMoviesWatched: number;
  totalTvEpisodesWatched: number;
  totalAnimeEpisodesWatched: number;
  totalHoursWatched: number;
  totalReviewsWritten: number;
  totalCollectionsCreated: number;
  favoriteGenre: string | null;
  favoriteActor: string | null;
  favoriteDirector: string | null;
  averageRating: number | null;
  currentMonthMovies: number;
  currentMonthEpisodes: number;
}

export interface UserStatsRow {
  user_id: string;
  total_movies_watched: number;
  total_tv_episodes_watched: number;
  total_anime_episodes_watched: number;
  total_hours_watched: number;
  total_reviews_written: number;
  total_collections_created: number;
  favorite_genre: string | null;
  favorite_actor: string | null;
  favorite_director: string | null;
  average_rating: number | null;
  current_month_movies: number;
  current_month_episodes: number;
  last_calculated_at: string;
}

// ===========================================================================
// ACTIVITY FEED
// ===========================================================================

export type ActivityType =
  | "watched"
  | "reviewed"
  | "added_to_collection"
  | "achievement"
  | "rated"
  | "completed_goal"
  | "watch_streak";

export interface UserActivity {
  id: string;
  userId: string;
  activityType: ActivityType;
  mediaType: string | null;
  mediaId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface UserActivityRow {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  media_type: string | null;
  media_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ===========================================================================
// DASHBOARD AGGREGATE
// ===========================================================================

export interface DashboardData {
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    publicSlug: string | null;
    settings: Record<string, any>;
  };
  stats: UserStats | null;
  recentActivity: UserActivity[];
  watchStreak: WatchStreak | null;
  monthlyGoals: MonthlyGoal[];
  recentAchievements: UserAchievement[];
  continueWatching: WatchHistoryEntry[];
  watchQueuePreview: { id: string; title: string; coverImageUrl: string | null; mediaType: string }[];
  dnaSnapshot: {
    topGenres: { name: string; weight: number }[];
    traits: string[];
  } | null;
}