-- Watch Together 2.0 — WT-4 Shared Watch Queue + Voting (normalized)

-- Notes:
-- - Do NOT remove or destructively modify watch_session_participants.responses.
-- - New tables are introduced as the single writable source for WT-4 queue.

-- ---------------------------------------------------------------------------
-- Queue items
-- ---------------------------------------------------------------------------
create table if not exists public.watch_session_queue (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.watch_sessions(id) on delete cascade,

  -- Media identity (client provides normalized TMDB/external identity)
  media_type text not null check (media_type in ('movie', 'tv', 'anime')),
  media_id text not null,

  -- Display fields
  title text not null,
  poster_url text,

  -- Audit
  suggested_by_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Optional selection indicator (non-authoritative; host persists chosen media)
  status text not null default 'queued' check (status in ('queued','removed')),

  -- Idempotency / duplicate prevention
  unique (session_id, media_type, media_id)
);

create index if not exists watch_session_queue_session_idx
  on public.watch_session_queue (session_id);
create index if not exists watch_session_queue_created_idx
  on public.watch_session_queue (session_id, created_at asc);

-- ---------------------------------------------------------------------------
-- Votes
-- ---------------------------------------------------------------------------
create table if not exists public.watch_session_queue_votes (
  id uuid primary key default gen_random_uuid(),
  queue_item_id uuid not null references public.watch_session_queue(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,

  -- 1 = up, -1 = down
  vote int not null check (vote in (1,-1)),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (queue_item_id, user_id)
);

create index if not exists watch_session_queue_votes_queue_idx
  on public.watch_session_queue_votes (queue_item_id);

create or replace function public.set_watch_queue_vote_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists watch_session_queue_votes_set_updated_at on public.watch_session_queue_votes;
create trigger watch_session_queue_votes_set_updated_at
before update on public.watch_session_queue_votes
for each row execute function public.set_watch_queue_vote_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- queue: read by participants; insert by participants (membership required);
-- host-only delete/update (moderation) for now via server-side enforcement.

alter table public.watch_session_queue enable row level security;
alter table public.watch_session_queue_votes enable row level security;

-- Participants read queue items
create policy "wsq_select_participants"
  on public.watch_session_queue
  for select
  using (
    exists (
      select 1 from public.watch_session_participants p
      where p.session_id = watch_session_queue.session_id
        and p.user_id = auth.uid()
    )
  );

-- Participants can insert queue items (host transfer/more restrictive rules enforced in server actions)
create policy "wsq_insert_participants"
  on public.watch_session_queue
  for insert
  with check (
    suggested_by_user_id = auth.uid()
    and exists (
      select 1 from public.watch_session_participants p
      where p.session_id = watch_session_queue.session_id
        and p.user_id = auth.uid()
    )
  );

-- Host can delete/mark removed (authorization enforced in server actions too)
create policy "wsq_host_delete"
  on public.watch_session_queue
  for delete
  using (
    exists (
      select 1 from public.watch_sessions s
      where s.id = watch_session_queue.session_id
        and s.host_user_id = auth.uid()
    )
  );

-- Votes: read by participants
create policy "wsqv_select_participants"
  on public.watch_session_queue_votes
  for select
  using (
    exists (
      select 1
      from public.watch_session_queue q
      join public.watch_session_participants p
        on p.session_id = q.session_id
      where q.id = watch_session_queue_votes.queue_item_id
        and p.user_id = auth.uid()
    )
  );

-- User manages only their own vote
create policy "wsqv_insert_own"
  on public.watch_session_queue_votes
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.watch_session_queue q
      join public.watch_session_participants p
        on p.session_id = q.session_id
      where q.id = watch_session_queue_votes.queue_item_id
        and p.user_id = auth.uid()
    )
  );

create policy "wsqv_update_own"
  on public.watch_session_queue_votes
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.watch_session_queue q
      join public.watch_session_participants p
        on p.session_id = q.session_id
      where q.id = watch_session_queue_votes.queue_item_id
        and p.user_id = auth.uid()
    )
  );

create policy "wsqv_delete_own"
  on public.watch_session_queue_votes
  for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Backfill: ensure selected media persists
-- ---------------------------------------------------------------------------
-- WT-4 host selection persists on watch_sessions.media_type/media_id.
-- No extra migration here.

