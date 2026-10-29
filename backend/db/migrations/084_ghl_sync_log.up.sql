-- Phase 1: GHL Integration - Structured sync log
-- Additive: new table only.

CREATE TABLE ghl_sync_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  email           TEXT        NOT NULL,
  entity_type     TEXT        NOT NULL
                  CHECK (entity_type IN ('resume_session', 'worker', 'user')),
  entity_id       TEXT        NOT NULL,

  operation       TEXT        NOT NULL,

  success         BOOLEAN     NOT NULL,
  ghl_contact_id  TEXT,
  error_message   TEXT,
  http_status     INTEGER
);

CREATE INDEX ghl_sync_log_email_idx
  ON ghl_sync_log (email, attempted_at DESC);

CREATE INDEX ghl_sync_log_failed_idx
  ON ghl_sync_log (success, attempted_at DESC)
  WHERE success = FALSE;

CREATE INDEX ghl_sync_log_entity_idx
  ON ghl_sync_log (entity_type, entity_id, attempted_at DESC);
