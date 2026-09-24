-- Row Level Security policies (02-TECHNICAL-ARCHITECTURE.md, Section 2g).
-- Default: user_id = auth.uid() for read/write. Public read only when opted in.

alter table public.profiles enable row level security;
alter table public.watchlist enable row level security;
alter table public.favorites enable row level security;
alter table public.history enable row level security;
alter table public.reviews enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.followed_artists enable row level security;
alter table public.notifications enable row level security;
alter table public.creator_follows enable row level security;
alter table public.user_memory enable row level security;
alter table public.entertainment_dna enable row level security;
alter table public.recommendation_feedback enable row level security;
alter table public.watch_sessions enable row level security;
alter table public.watch_session_participants enable row level security;
alter table public.watch_session_results enable row level security;

-- profiles: public rows readable by anyone; always readable/writable by owner.
create policy "profiles_select_public_or_own" on public.profiles
  for select using (is_public = true or id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Generic owner-only policy helper applied to simple user-owned tables.
create policy "watchlist_owner" on public.watchlist
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "favorites_owner" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "history_owner" on public.history
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "followed_artists_owner" on public.followed_artists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_owner" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_memory_owner" on public.user_memory
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recommendation_feedback_owner" on public.recommendation_feedback
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reviews: publicly readable, owner-writable.
create policy "reviews_select_all" on public.reviews
  for select using (true);
create policy "reviews_insert_own" on public.reviews
  for insert with check (user_id = auth.uid());
create policy "reviews_update_own" on public.reviews
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reviews_delete_own" on public.reviews
  for delete using (user_id = auth.uid());

-- collections: public when is_public, else owner-only. Writable by owner.
create policy "collections_select_public_or_own" on public.collections
  for select using (is_public = true or user_id = auth.uid());
create policy "collections_modify_own" on public.collections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "collection_items_select" on public.collection_items
  for select using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id
        and (c.is_public = true or c.user_id = auth.uid())
    )
  );
create policy "collection_items_modify_own" on public.collection_items
  for all using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

-- entertainment_dna: public when is_public, else owner-only. Written server-side.
create policy "dna_select_public_or_own" on public.entertainment_dna
  for select using (is_public = true or user_id = auth.uid());
create policy "dna_modify_own" on public.entertainment_dna
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- creator_follows: follower manages their own follows; readable by both parties.
create policy "creator_follows_select" on public.creator_follows
  for select using (
    follower_user_id = auth.uid() or creator_user_id = auth.uid()
  );
create policy "creator_follows_modify_own" on public.creator_follows
  for all using (follower_user_id = auth.uid())
  with check (follower_user_id = auth.uid());

-- watch sessions: readable by anyone with the session id (needed for guests).
create policy "watch_sessions_select_all" on public.watch_sessions
  for select using (true);
create policy "watch_sessions_host_modify" on public.watch_sessions
  for all using (host_user_id = auth.uid())
  with check (host_user_id = auth.uid());

create policy "wsp_select_all" on public.watch_session_participants
  for select using (true);
-- Any visitor may join a session (guests allowed); only rows tied to the
-- current user (or anonymous guest rows) can be updated by that user.
create policy "wsp_insert" on public.watch_session_participants
  for insert with check (user_id = auth.uid() or user_id is null);
create policy "wsp_update_own" on public.watch_session_participants
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "wsr_select_all" on public.watch_session_results
  for select using (true);
create policy "wsr_host_modify" on public.watch_session_results
  for all using (
    exists (
      select 1 from public.watch_sessions s
      where s.id = session_id and s.host_user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.watch_sessions s
      where s.id = session_id and s.host_user_id = auth.uid()
    )
  );
