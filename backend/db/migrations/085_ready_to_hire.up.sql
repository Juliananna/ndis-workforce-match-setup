-- Phase 1: GHL Integration - Ready-to-hire approval workflow
-- Additive: new columns and table only.

-- workers: readiness approval state
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS ready_to_hire              BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ready_to_hire_approved_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_to_hire_approved_by  TEXT,
  ADD COLUMN IF NOT EXISTS ready_to_hire_revoked_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_to_hire_revoked_by   TEXT,
  ADD COLUMN IF NOT EXISTS ready_to_hire_revoke_reason TEXT;

-- ready_to_hire_audit: full decision history
CREATE TABLE ready_to_hire_audit (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id           UUID        NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
  action              TEXT        NOT NULL CHECK (action IN ('approved', 'revoked', 'auto_revoked')),
  acted_by_user_id    UUID        REFERENCES users(user_id) ON DELETE SET NULL,
  acted_by_email      TEXT,
  reason              TEXT,

  eligible_doc_count    INTEGER NOT NULL DEFAULT 0,
  verified_doc_count    INTEGER NOT NULL DEFAULT 0,
  verified_ref_count    INTEGER NOT NULL DEFAULT 0,
  mandatory_doc_types   TEXT[]  NOT NULL DEFAULT '{}',
  eligibility_snapshot  JSONB,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ready_to_hire_audit_worker_idx
  ON ready_to_hire_audit (worker_id, created_at DESC);
