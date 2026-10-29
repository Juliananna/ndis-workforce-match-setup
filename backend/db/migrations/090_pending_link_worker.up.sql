ALTER TABLE resume_sessions
  ADD COLUMN IF NOT EXISTS pending_link_worker_id UUID REFERENCES workers(worker_id) ON DELETE SET NULL;

COMMENT ON COLUMN resume_sessions.pending_link_worker_id IS
  'Set when an email address matches an existing worker account but ownership has not yet been proven. '
  'Cleared and replaced by converted_worker_id once the user logs in and confirms the link.';

CREATE INDEX IF NOT EXISTS resume_sessions_pending_link_idx
  ON resume_sessions (pending_link_worker_id)
  WHERE pending_link_worker_id IS NOT NULL;
