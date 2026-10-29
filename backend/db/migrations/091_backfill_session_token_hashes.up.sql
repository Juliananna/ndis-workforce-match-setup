-- Backfill session_token_hash for legacy resume_sessions that have a
-- known converted_worker_id but no hash yet.  A random hash is stamped
-- so that the session owner can recover access via workerCreateOrGetSession
-- (authenticated endpoint), which rotates the token on each call.
-- Sessions without a converted_worker_id and without a hash remain blocked
-- (anonymous sessions created before token enforcement) — these should be
-- resolved via admin support.
UPDATE resume_sessions
SET session_token_hash = encode(sha256(gen_random_bytes(32)), 'hex'),
    updated_at         = NOW()
WHERE session_token_hash IS NULL
  AND converted_worker_id IS NOT NULL;
