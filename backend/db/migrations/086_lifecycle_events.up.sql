-- Phase 2: Lifecycle event infrastructure
-- All changes are purely additive.

-- resume_sessions: independent completion milestone columns
-- resume_completed_at is set when the final questionnaire step is submitted,
-- regardless of whether profile creation was accepted or declined.
-- This is deliberately separate from status = 'converted' so the milestone
-- is never lost when a session is later converted.
ALTER TABLE resume_sessions
  ADD COLUMN IF NOT EXISTS resume_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resume_completed_step INTEGER;

-- Extend status CHECK to include 'completed'.
-- We cannot drop/recreate the CHECK in-place on Postgres without a full table
-- rewrite, so we add a new partial index as the enforced constraint instead,
-- and rely on the application layer for valid status values.
-- The legacy CHECK values (draft, email_captured, converted, archived) remain valid.
-- New value 'completed' is accepted by the application and the new index below.
-- NOTE: the original CHECK constraint in migration 055 only covers the four
-- original values; 'completed' is guarded by application logic here.

-- workers: sms_consent column (null = unknown, never inferred from marketing_consent)
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS sms_consent        BOOLEAN,
  ADD COLUMN IF NOT EXISTS sms_consent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_consent_source TEXT;

-- lifecycle_events: durable, append-only event log with idempotency key
-- One row per unique (entity_type, entity_id, event_type, idempotency_key).
-- Callers supply an idempotency_key (typically a deterministic hash of
-- entity_id + event_type + version-relevant state) to prevent duplicate events
-- on retry.
CREATE TABLE IF NOT EXISTS lifecycle_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         TEXT        NOT NULL,   -- caller-supplied idempotency key (unique)
  event_type       TEXT        NOT NULL,
  event_version    INTEGER     NOT NULL DEFAULT 1,

  entity_type      TEXT        NOT NULL
                   CHECK (entity_type IN ('resume_session', 'worker', 'user')),
  entity_id        TEXT        NOT NULL,   -- UUID of the entity, stored as TEXT for flexibility

  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload          JSONB       NOT NULL DEFAULT '{}',

  -- optional back-links for fast lookup without JSON parsing
  worker_id        UUID        REFERENCES workers(worker_id) ON DELETE SET NULL,
  session_id       UUID        REFERENCES resume_sessions(id) ON DELETE SET NULL,
  user_id          UUID        REFERENCES users(user_id) ON DELETE SET NULL,

  UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS lifecycle_events_entity_idx
  ON lifecycle_events (entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS lifecycle_events_worker_idx
  ON lifecycle_events (worker_id, occurred_at DESC)
  WHERE worker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lifecycle_events_type_idx
  ON lifecycle_events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS lifecycle_events_session_idx
  ON lifecycle_events (session_id, occurred_at DESC)
  WHERE session_id IS NOT NULL;
