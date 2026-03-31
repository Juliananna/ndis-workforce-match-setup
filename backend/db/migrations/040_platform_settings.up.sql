CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (key, value, description) VALUES
  ('site_name', 'Kizazi Hire', 'Display name for the platform'),
  ('support_email', 'support@kizazihire.com.au', 'Email address shown to users for support'),
  ('worker_match_radius_km', '50', 'Default radius in km for worker-job geo matching'),
  ('max_offers_per_job', '10', 'Maximum number of concurrent offers per job request'),
  ('document_expiry_warn_days_60', 'true', 'Send 60-day document expiry warning emails'),
  ('document_expiry_warn_days_30', 'true', 'Send 30-day document expiry warning emails'),
  ('emergency_shift_email_enabled', 'true', 'Send email alerts for emergency shifts'),
  ('reengagement_email_enabled', 'true', 'Send monthly re-engagement emails to inactive workers'),
  ('profile_reminder_email_enabled', 'true', 'Send weekly profile completion reminder emails'),
  ('subscription_expiry_reminder_enabled', 'true', 'Send subscription expiry reminder emails')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_admin_user_id_idx ON admin_audit_log (admin_user_id);
