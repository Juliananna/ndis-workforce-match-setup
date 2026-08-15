CREATE TABLE worker_profile_nudge_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, nudge_type)
);

CREATE INDEX worker_profile_nudge_log_user_idx ON worker_profile_nudge_log (user_id);
CREATE INDEX worker_profile_nudge_log_nudge_type_idx ON worker_profile_nudge_log (nudge_type);
