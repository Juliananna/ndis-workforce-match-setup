-- Phase 1: GHL Integration - Attribution and GHL tracking columns
-- All changes are purely additive (new nullable columns on existing tables).
-- No existing rows, constraints, or indexes are modified.

-- resume_sessions: first-touch advertising attribution
ALTER TABLE resume_sessions
  ADD COLUMN IF NOT EXISTS utm_source      TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium      TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign    TEXT,
  ADD COLUMN IF NOT EXISTS utm_content     TEXT,
  ADD COLUMN IF NOT EXISTS utm_term        TEXT,
  ADD COLUMN IF NOT EXISTS meta_campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_adset_id   TEXT,
  ADD COLUMN IF NOT EXISTS meta_ad_id      TEXT,
  ADD COLUMN IF NOT EXISTS meta_lead_id    TEXT,
  ADD COLUMN IF NOT EXISTS fbclid          TEXT,
  ADD COLUMN IF NOT EXISTS landing_page    TEXT;

-- GHL contact linkage (written back when GHL upsert first succeeds)
ALTER TABLE resume_sessions
  ADD COLUMN IF NOT EXISTS ghl_contact_id     TEXT,
  ADD COLUMN IF NOT EXISTS ghl_last_synced_at TIMESTAMPTZ;

-- workers: GHL tracking columns
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS ghl_contact_id      TEXT,
  ADD COLUMN IF NOT EXISTS ghl_last_synced_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ghl_sync_failed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ghl_sync_error      TEXT,
  ADD COLUMN IF NOT EXISTS marketing_consent   BOOLEAN,
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS workers_ghl_contact_id_idx ON workers (ghl_contact_id)
  WHERE ghl_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS resume_sessions_ghl_contact_id_idx ON resume_sessions (ghl_contact_id)
  WHERE ghl_contact_id IS NOT NULL;
