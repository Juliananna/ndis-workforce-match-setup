CREATE TABLE IF NOT EXISTS saved_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employer_id, worker_id)
);

CREATE INDEX IF NOT EXISTS saved_workers_employer_idx ON saved_workers (employer_id, created_at DESC);
