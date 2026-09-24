-- Admin User Management extensions
-- Adds status tracking and audit logging for admin actions

-- Add status column to profiles (active, suspended, banned)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended', 'banned'));

-- Admin audit log for tracking all admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type text, -- 'user', 'review', 'collection', 'content'
  target_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
  ON public.admin_audit_log
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM admin_roles WHERE role = 'admin')
  );

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_log
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_roles WHERE role IN ('admin', 'moderator'))
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS admin_audit_log_admin_user_idx ON public.admin_audit_log (admin_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_user_idx ON public.admin_audit_log (target_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

-- Helper function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_target_user_id uuid DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_user_id, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_user_id, p_target_type, p_target_id, p_details)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;
