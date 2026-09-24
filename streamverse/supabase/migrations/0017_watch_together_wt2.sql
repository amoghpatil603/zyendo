-- Watch Together 2.0 - WT-2 Real-time Chat + Emoji Reactions
-- Adds chat messages table, typing indicators, and reaction support

-- Chat messages table for persistent room chat
CREATE TABLE IF NOT EXISTS public.watch_session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.watch_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient message loading per room
CREATE INDEX IF NOT EXISTS watch_session_messages_session_idx ON public.watch_session_messages (session_id, created_at DESC);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS watch_session_messages_user_idx ON public.watch_session_messages (user_id);

-- Enable Realtime for chat messages
ALTER TABLE public.watch_session_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read messages from rooms they've joined
CREATE POLICY IF NOT EXISTS "Messages readable by room participants"
  ON public.watch_session_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.watch_session_participants
      WHERE session_id = watch_session_messages.session_id
      AND user_id = auth.uid()
    )
  );

-- RLS: Users can insert messages only to rooms they've joined, with server-side validation
CREATE POLICY IF NOT EXISTS "Messages insertable by room participants"
  ON public.watch_session_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.watch_session_participants
      WHERE session_id = watch_session_messages.session_id
      AND user_id = auth.uid()
    )
  );

-- RLS: Users can only update their own messages
CREATE POLICY IF NOT EXISTS "Users can update own messages"
  ON public.watch_session_messages
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: Users can only delete their own messages
CREATE POLICY IF NOT EXISTS "Users can delete own messages"
  ON public.watch_session_messages
  FOR DELETE
  USING (user_id = auth.uid());

-- Trigger to enforce message length limit (server-side validation)
CREATE OR REPLACE FUNCTION public.check_message_length()
RETURNS TRIGGER AS $$
BEGIN
  IF LENGTH(NEW.body) = 0 OR LENGTH(NEW.body) > 1000 THEN
    RAISE EXCEPTION 'Message must be between 1 and 1000 characters';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS watch_session_messages_length_check ON public.watch_session_messages;
CREATE TRIGGER watch_session_messages_length_check
  BEFORE INSERT OR UPDATE ON public.watch_session_messages
  FOR EACH ROW EXECUTE FUNCTION public.check_message_length();