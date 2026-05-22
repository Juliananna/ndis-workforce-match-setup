ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'active'
    CHECK (onboarding_status IN ('active', 'compliance_required'));
