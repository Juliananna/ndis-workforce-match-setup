ALTER TABLE users ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_sysadmin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE admin_users
SET is_sysadmin = TRUE
WHERE user_id IN (
  SELECT u.user_id FROM users u WHERE u.email = 'sysadmin@kizazihire.com.au'
);
