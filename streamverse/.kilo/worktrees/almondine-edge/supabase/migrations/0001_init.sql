-- StreamVerse initial schema
-- Full data model from 02-TECHNICAL-ARCHITECTURE.md. All user-owned tables get
-- Row Level Security in 0002_rls.sql.

-- Profiles extend Supabase auth.users.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  public_slug text unique,
  is_public boolean not null default false,
  referred_by text,
  creator_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null check (media_type in ('movie','tv','anime')),
  media_id text not null,
  added_at timestamptz not null default now(),
  unique (user_id, media_type, media_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null,
  media_id text not null,
  added_at timestamptz not null default now(),
  unique (user_id, media_type, media_id)
);

create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null,
  media_id text not null,
  viewed_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null,
  media_id text not null,
  rating int check (rating between 1 and 10),
  body text,
  created_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  media_type text not null,
  media_id text not null
);

create table if not exists public.followed_artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  artist_id text not null,
  unique (user_id, artist_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('release','episode','music')),
  payload jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references public.profiles(id) on delete cascade,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_user_id, creator_user_id)
);

create table if not exists public.user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  statement text not null,
  type text not null check (type in ('exclusion','constraint','context','preference')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.entertainment_dna (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  genre_weights jsonb,
  top_actors jsonb,
  top_directors jsonb,
  top_studios jsonb,
  music_genre_weights jsonb,
  preferred_languages text[],
  preferred_runtime_range int4range,
  mood_tags text[],
  is_public boolean not null default false,
  last_computed_at timestamptz not null default now()
);

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null,
  media_id text not null,
  source text not null check (source in ('ai_picks','assistant','watch_together')),
  reaction text not null check (reaction in ('loved','okay','disliked')),
  created_at timestamptz not null default now()
);

create table if not exists public.watch_sessions (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid references public.profiles(id) on delete set null,
  status text not null check (status in ('open','closed')) default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.watch_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.watch_sessions(id) on delete cascade,
  display_name text,
  user_id uuid references public.profiles(id) on delete set null,
  responses jsonb
);

create table if not exists public.watch_session_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.watch_sessions(id) on delete cascade,
  media_type text not null,
  media_id text not null,
  rank int,
  reason text
);

-- Helpful indexes for per-user lookups.
create index if not exists watchlist_user_idx on public.watchlist (user_id);
create index if not exists favorites_user_idx on public.favorites (user_id);
create index if not exists history_user_idx on public.history (user_id, viewed_at desc);
create index if not exists reviews_media_idx on public.reviews (media_type, media_id);
create index if not exists notifications_user_idx on public.notifications (user_id, read);

-- Auto-provision a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
