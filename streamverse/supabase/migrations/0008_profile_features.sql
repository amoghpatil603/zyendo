-- StreamVerse Phase 2 — Personal Experience
-- Adds tables for Profile Dashboard, enhanced Reviews, Watch History,
-- Achievements, Monthly Goals, Watch Streaks, and User Stats.

-- ===========================================================================
-- 1. REVIEW ENHANCEMENTS
-- ===========================================================================

-- Add spoiler toggle and helpful votes counter to existing reviews table
alter table public.reviews
  add column if not exists is_spoiler boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists helpful_count int not null default 0;

-- Track which users found a review helpful
create table if not exists public.review_helpful_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (review_id, user_id)
);

-- ===========================================================================
-- 2. WATCH HISTORY
-- ===========================================================================

create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null check (media_type in ('movie','tv','anime')),
  media_id text not null,
  title text not null,
  cover_image_url text,
  watched_at timestamptz not null default now(),
  duration_minutes int,
  rating int check (rating between 1 and 10),
  unique (user_id, media_type, media_id, watched_at)
);

create index if not exists watch_history_user_idx on public.watch_history (user_id, watched_at desc);
create index if not exists watch_history_type_idx on public.watch_history (user_id, media_type, watched_at desc);

-- ===========================================================================
-- 3. ACHIEVEMENTS
-- ===========================================================================

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  icon_url text,
  category text not null check (category in ('milestone','genre','social','streak','special')),
  requirement_type text not null,
  requirement_value int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- ===========================================================================
-- 4. MONTHLY GOALS
-- ===========================================================================

create table if not exists public.monthly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_type text not null check (goal_type in ('movies_watched','episodes_watched','shows_completed','genre_watch','hours_watched')),
  target_value int not null,
  current_value int not null default 0,
  metadata jsonb,
  month int not null check (month between 1 and 12),
  year int not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, goal_type, month, year)
);

-- ===========================================================================
-- 5. WATCH STREAKS
-- ===========================================================================

create table if not exists public.watch_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_watch_date date,
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ===========================================================================
-- 6. USER STATISTICS (cached for fast dashboard loading)
-- ===========================================================================

create table if not exists public.user_stats (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  total_movies_watched int not null default 0,
  total_tv_episodes_watched int not null default 0,
  total_anime_episodes_watched int not null default 0,
  total_hours_watched numeric(10,2) not null default 0,
  total_reviews_written int not null default 0,
  total_collections_created int not null default 0,
  favorite_genre text,
  favorite_actor text,
  favorite_director text,
  average_rating numeric(3,1),
  current_month_movies int not null default 0,
  current_month_episodes int not null default 0,
  last_calculated_at timestamptz not null default now()
);

-- ===========================================================================
-- 7. USER ACTIVITY FEED (for dashboard recent activity)
-- ===========================================================================

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null check (activity_type in ('watched','reviewed','added_to_collection','achievement','rated','completed_goal','watch_streak')),
  media_type text,
  media_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_activity_user_idx on public.user_activity (user_id, created_at desc);

-- ===========================================================================
-- 8. HELPERS
-- ===========================================================================

-- Function to log user activity
create or replace function public.log_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_media_type text default null,
  p_media_id text default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.user_activity (user_id, activity_type, media_type, media_id, metadata)
  values (p_user_id, p_activity_type, p_media_type, p_media_id, p_metadata)
  returning id into v_id;
  return v_id;
end;
$$;