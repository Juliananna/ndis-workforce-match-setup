ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('WORKER', 'EMPLOYER', 'COMPLIANCE'));

CREATE TABLE IF NOT EXISTS compliance_officers (
  user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
