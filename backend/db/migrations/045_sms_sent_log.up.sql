CREATE TABLE sms_sent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  recipient_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  is_bulk BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_sent_log_sent_at ON sms_sent_log(sent_at DESC);
CREATE INDEX idx_sms_sent_log_recipient ON sms_sent_log(recipient_user_id);
