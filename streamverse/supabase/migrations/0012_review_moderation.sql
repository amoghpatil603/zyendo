-- Review Moderation system
-- Adds review reporting and hidden review tracking

-- Review reports table
CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

-- Only admins/moderators can read reports
CREATE POLICY "Admins can read review reports"
  ON public.review_reports
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator'))
  );

-- Only admins/moderators can update reports
CREATE POLICY "Admins can update review reports"
  ON public.review_reports
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator'))
  );

-- Anyone can insert a report
CREATE POLICY "Anyone can report reviews"
  ON public.review_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Add hidden column to reviews for moderation
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Add featured column for highlighting good reviews
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Index for moderation queries
CREATE INDEX IF NOT EXISTS review_reports_status_idx ON public.review_reports (status);
CREATE INDEX IF NOT EXISTS review_reports_review_idx ON public.review_reports (review_id);
CREATE INDEX IF NOT EXISTS reviews_hidden_idx ON public.reviews (is_hidden);
CREATE INDEX IF NOT EXISTS reviews_featured_idx ON public.reviews (is_featured);
