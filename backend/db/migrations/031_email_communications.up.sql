CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_sent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  sent_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  recipient_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_bulk BOOLEAN NOT NULL DEFAULT FALSE,
  bulk_count INTEGER,
  target_role TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_sent_log_sent_at_idx ON email_sent_log (sent_at DESC);
CREATE INDEX email_sent_log_recipient_idx ON email_sent_log (recipient_user_id);
CREATE INDEX email_sent_log_sent_by_idx ON email_sent_log (sent_by);
