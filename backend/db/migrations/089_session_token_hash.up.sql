ALTER TABLE resume_sessions
  ADD COLUMN IF NOT EXISTS session_token_hash TEXT;

CREATE INDEX IF NOT EXISTS resume_sessions_token_hash_idx
  ON resume_sessions (session_token_hash)
  WHERE session_token_hash IS NOT NULL;
