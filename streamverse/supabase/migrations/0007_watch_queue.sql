-- watch_queue: future viewing queue + watching/watched history.
-- Modeled after public.watchlist patterns with owner-only RLS.

create table if not exists public.watch_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tmdb_id text not null,
  media_type text not null check (media_type in ('movie','tv')),
  title text not null,
  poster_path text,
  release_date text,
  status text not null check (status in ('pending','watching','watched')) default 'pending',
  added_at timestamptz not null default now(),
  watched_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, media_type, tmdb_id)
);

-- Helpful indexes for per-user lookups + sorting.
create index if not exists watch_queue_user_idx on public.watch_queue (user_id);
create index if not exists watch_queue_user_status_idx on public.watch_queue (user_id, status, added_at desc);
create index if not exists watch_queue_user_watched_at_idx on public.watch_queue (user_id, watched_at desc);

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists watch_queue_set_updated_at on public.watch_queue;
create trigger watch_queue_set_updated_at
before update on public.watch_queue
for each row execute function public.set_updated_at();

-- Enable Row Level Security.
alter table public.watch_queue enable row level security;

-- Owner policy: users can CRUD and update their own queue rows.
create policy "watch_queue_owner" on public.watch_queue
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

