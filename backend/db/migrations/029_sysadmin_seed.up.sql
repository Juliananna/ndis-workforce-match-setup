CREATE TABLE IF NOT EXISTS sysadmin_bootstrap (
  bootstrapped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
