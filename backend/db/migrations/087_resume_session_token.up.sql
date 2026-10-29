-- Add secure guest-session token to resume_sessions.
-- session_token_hash stores the SHA-256 hex digest of a random token issued
-- at session creation. Callers must supply the matching token for all
-- mutating and sensitive read operations.  Read-only preview endpoints
-- (public_get) do not require the token.
-- Existing sessions without a token are treated as legacy; the backend
-- re-issues a token on their next update and stores the hash.
ALTER TABLE resume_sessions
  ADD COLUMN IF NOT EXISTS session_token_hash TEXT;

CREATE INDEX IF NOT EXISTS resume_sessions_token_hash_idx
  ON resume_sessions (session_token_hash)
  WHERE session_token_hash IS NOT NULL;
