ALTER TABLE resume_sessions
  ALTER COLUMN support_settings TYPE jsonb USING to_jsonb(support_settings),
  ALTER COLUMN support_tasks    TYPE jsonb USING to_jsonb(support_tasks),
  ALTER COLUMN languages        TYPE jsonb USING to_jsonb(languages);
