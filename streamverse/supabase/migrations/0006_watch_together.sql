-- Watch Together extends the initial session tables with an inviteable room and
-- participant-owned suggestion/vote state. Existing rows remain valid.
alter table public.watch_sessions
  add column if not exists invite_code text unique,
  add column if not exists name text not null default 'Watch Together';

update public.watch_sessions
  set invite_code = replace(id::text, '-', '')
  where invite_code is null;
alter table public.watch_sessions alter column invite_code set not null;

alter table public.watch_session_participants
  add column if not exists is_ready boolean not null default false,
  add column if not exists joined_at timestamptz not null default now();
alter table public.watch_session_participants
  alter column responses set default '{"suggestions": [], "votes": []}'::jsonb;
update public.watch_session_participants
  set responses = '{"suggestions": [], "votes": []}'::jsonb
  where responses is null;
alter table public.watch_session_participants alter column responses set not null;

create unique index if not exists watch_session_participant_user_key
  on public.watch_session_participants (session_id, user_id)
  where user_id is not null;
create unique index if not exists watch_sessions_invite_code_key
  on public.watch_sessions (invite_code);

-- Align the original constraint with the reactions used by the application.
alter table public.recommendation_feedback
  drop constraint if exists recommendation_feedback_reaction_check;
alter table public.recommendation_feedback
  add constraint recommendation_feedback_reaction_check
  check (reaction in ('love', 'like', 'dislike'));

-- A participant must be able to update their own ready state and responses.
drop policy if exists "wsp_update_own" on public.watch_session_participants;
create policy "wsp_update_own" on public.watch_session_participants
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
