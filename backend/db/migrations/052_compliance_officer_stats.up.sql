ALTER TABLE reference_checks
  ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reference_checks_verified_by_idx ON reference_checks (verified_by_user_id, created_at DESC);
