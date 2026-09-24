-- Per-user daily AI Picks cache. Recommendation payloads are normalized MediaItem
-- objects plus a short personal explanation, so the UI does not call the AI provider on load.
create table if not exists public.ai_picks_cache (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  recommendations jsonb not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.ai_picks_cache enable row level security;

create policy "ai_picks_cache_owner" on public.ai_picks_cache
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
