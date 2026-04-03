CREATE TABLE IF NOT EXISTS worker_onboarding_emails (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  email_step    INT  NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, email_step)
);

CREATE INDEX IF NOT EXISTS idx_worker_onboarding_emails_user ON worker_onboarding_emails(user_id);
