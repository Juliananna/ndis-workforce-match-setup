CREATE TABLE IF NOT EXISTS rto_enquiries (
  enquiry_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  organisation_name TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  message          TEXT NOT NULL,
  rto_slug         TEXT,
  status           TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new', 'contacted', 'qualified', 'onboarding', 'partner', 'not_interested')),
  notes            TEXT,
  assigned_to      TEXT,
  last_contacted_at TIMESTAMPTZ,
  follow_up_at     DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rto_enquiries_status ON rto_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_rto_enquiries_created ON rto_enquiries(created_at DESC);
