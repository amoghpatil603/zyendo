-- Watch Together 2.0 - WT-1 Room Foundation
-- Adds fields for public/private rooms, participant limits, media selection, and room lifecycle

-- Add new columns to watch_sessions
ALTER TABLE public.watch_sessions
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_participants int CHECK (max_participants > 0 AND max_participants <= 100) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS media_type text CHECK (media_type IN ('movie', 'tv', 'anime')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;

-- Add status for ended rooms
ALTER TABLE public.watch_sessions
  DROP CONSTRAINT IF EXISTS watch_sessions_status_check,
  ADD CONSTRAINT watch_sessions_status_check
  CHECK (status IN ('open', 'closed', 'ended'));

-- Add index for public room browser
CREATE INDEX IF NOT EXISTS watch_sessions_public_idx ON public.watch_sessions (is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS watch_sessions_status_idx ON public.watch_sessions (status);

-- Add joined_at column to participants (for host transfer)
ALTER TABLE public.watch_session_participants
  ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now();

-- Add index for host transfer queries
CREATE INDEX IF NOT EXISTS watch_session_participants_joined_idx ON public.watch_session_participants (joined_at);