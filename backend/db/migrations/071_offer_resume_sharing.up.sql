ALTER TABLE offers
  ADD COLUMN resume_shared_at TIMESTAMPTZ,
  ADD COLUMN resume_session_id TEXT;
