CREATE TABLE IF NOT EXISTS privacy_policy (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

INSERT INTO privacy_policy (content, updated_at)
VALUES ('', NOW())
ON CONFLICT DO NOTHING;
