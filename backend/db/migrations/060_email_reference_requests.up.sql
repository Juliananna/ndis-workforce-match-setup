ALTER TABLE reference_checks
  ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'phone' CHECK (method IN ('phone', 'email'));

CREATE TABLE email_reference_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id UUID NOT NULL REFERENCES worker_references(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  sent_by_user_id UUID NOT NULL REFERENCES users(user_id),
  sent_to_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Expired', 'Cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_reference_requests_reference_id_idx ON email_reference_requests(reference_id);
CREATE INDEX email_reference_requests_token_idx ON email_reference_requests(token);
