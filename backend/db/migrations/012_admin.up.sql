CREATE TABLE admin_users (
  user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(user_id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE worker_documents
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(user_id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
