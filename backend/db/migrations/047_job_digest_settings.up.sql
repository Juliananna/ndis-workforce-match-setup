INSERT INTO platform_settings (key, value, description) VALUES
  ('job_digest_weekly_enabled', 'true', 'Send weekly job digest emails to active workers every Monday morning'),
  ('job_digest_daily_enabled', 'false', 'Send daily job digest emails to active workers every weekday morning')
ON CONFLICT (key) DO NOTHING;
