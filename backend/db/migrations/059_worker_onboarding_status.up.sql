ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'compliance_required'
    CHECK (onboarding_status IN ('active', 'compliance_required'));
