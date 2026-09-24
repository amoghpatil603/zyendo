-- WT-3: Playback state table for synchronized playback
create table if not exists watch_session_playback (
  session_id uuid references watch_sessions(id) on delete cascade,
  status text not null check (status in ('playing', 'paused', 'stopped')),
  current_time numeric not null default 0,
  playback_rate numeric not null default 1,
  updated_at timestamp with time zone not null default now(),
  sequence bigint not null default 0,
  primary key (session_id)
);

-- RLS: Only room participants can read playback state
create policy "Participants can read playback state"
  on watch_session_playback
  for select
  using (
    exists (
      select 1 from watch_session_participants
      where watch_session_participants.session_id = watch_session_playback.session_id
      and watch_session_participants.user_id = auth.uid()
    )
  );

-- RLS: Only host can update playback state
create policy "Host can update playback state"
  on watch_session_playback
  for update
  using (
    exists (
      select 1 from watch_sessions
      where watch_sessions.id = watch_session_playback.session_id
      and watch_sessions.host_user_id = auth.uid()
    )
  );

-- RLS: Host can insert playback state
create policy "Host can insert playback state"
  on watch_session_playback
  for insert
  with check (
    exists (
      select 1 from watch_sessions
      where watch_sessions.id = watch_session_playback.session_id
      and watch_sessions.host_user_id = auth.uid()
    )
  );

-- Trigger to update updated_at and increment sequence
create or replace function update_playback_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  new.sequence = COALESCE((select sequence from watch_session_playback where session_id = new.session_id), 0) + 1;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_playback_timestamp on watch_session_playback;
create trigger set_playback_timestamp
  before insert or update on watch_session_playback
  for each row
  execute function update_playback_timestamp();