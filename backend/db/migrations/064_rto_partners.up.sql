CREATE TABLE IF NOT EXISTS rto_partners (
  rto_partner_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  contact_name     TEXT NOT NULL,
  contact_email    TEXT NOT NULL,
  phone            TEXT,
  website          TEXT,
  logo_url         TEXT,
  referral_code    TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rto_referrals (
  referral_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rto_partner_id   UUID NOT NULL REFERENCES rto_partners(rto_partner_id),
  user_id          UUID REFERENCES users(user_id),
  worker_id        UUID REFERENCES workers(worker_id),
  referral_code    TEXT NOT NULL,
  source_url       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rto_referrals_partner ON rto_referrals(rto_partner_id);
CREATE INDEX IF NOT EXISTS idx_rto_referrals_user ON rto_referrals(user_id);

CREATE TABLE IF NOT EXISTS worker_student_profiles (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id                   UUID NOT NULL UNIQUE REFERENCES workers(worker_id),
  rto_partner_id              UUID REFERENCES rto_partners(rto_partner_id),
  is_current_student          BOOLEAN NOT NULL DEFAULT TRUE,
  course_name                 TEXT,
  qualification_level         TEXT,
  placement_required          BOOLEAN NOT NULL DEFAULT FALSE,
  placement_hours_required    INT,
  placement_hours_completed   INT NOT NULL DEFAULT 0,
  placement_start_date        DATE,
  preferred_placement_suburbs TEXT[],
  wants_paid_work             BOOLEAN NOT NULL DEFAULT TRUE,
  rto_progress_consent        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS can_host_students              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS placement_supervision_available BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS placement_service_areas        TEXT[],
  ADD COLUMN IF NOT EXISTS max_students_per_month         INT,
  ADD COLUMN IF NOT EXISTS open_to_entry_level_workers    BOOLEAN NOT NULL DEFAULT FALSE;
