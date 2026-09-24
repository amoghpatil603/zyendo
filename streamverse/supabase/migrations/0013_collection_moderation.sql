-- Collection Moderation system

-- Collection reports table
CREATE TABLE IF NOT EXISTS public.collection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.collection_reports ENABLE ROW LEVEL SECURITY;

-- Admins/moderators can read reports
CREATE POLICY "Admins can read collection reports"
  ON public.collection_reports FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')));

-- Admins/moderators can update reports
CREATE POLICY "Admins can update collection reports"
  ON public.collection_reports FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator')));

-- Anyone can insert a report
CREATE POLICY "Anyone can report collections"
  ON public.collection_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Add moderation columns to collections
ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS collection_reports_status_idx ON public.collection_reports (status);
CREATE INDEX IF NOT EXISTS collection_reports_collection_idx ON public.collection_reports (collection_id);
CREATE INDEX IF NOT EXISTS collections_hidden_idx ON public.collections (is_hidden);
CREATE INDEX IF NOT EXISTS collections_featured_idx ON public.collections (is_featured);
