-- Admin Roles table
-- This tracks which users have administrative access to the platform.
CREATE TABLE IF NOT EXISTS admin_roles (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'moderator', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can read the admin_roles table
CREATE POLICY "Admins can read admin_roles"
  ON admin_roles
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM admin_roles WHERE role = 'admin')
  );

-- Only admins can insert/update/delete admin roles
CREATE POLICY "Admins can manage admin_roles"
  ON admin_roles
  FOR ALL
  USING (
    auth.uid() IN (SELECT user_id FROM admin_roles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_roles WHERE role = 'admin')
  );

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = $1
    AND admin_roles.role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_admin_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_roles_updated_at
  BEFORE UPDATE ON admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_roles_updated_at();
