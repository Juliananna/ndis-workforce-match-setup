CREATE TABLE reference_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id UUID NOT NULL REFERENCES worker_references(id) ON DELETE CASCADE,
  conducted_by TEXT NOT NULL,
  conducted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Section 4: Applicant Verification (non-scored)
  relationship TEXT,
  capacity TEXT,
  employment_dates TEXT,
  reason_for_leaving TEXT,

  -- Section 6: Performance Scores (1-5)
  score_work_performance INT CHECK (score_work_performance BETWEEN 1 AND 5),
  score_reliability INT CHECK (score_reliability BETWEEN 1 AND 5),
  score_punctuality INT CHECK (score_punctuality BETWEEN 1 AND 5),
  score_professionalism INT CHECK (score_professionalism BETWEEN 1 AND 5),
  score_quality_of_care INT CHECK (score_quality_of_care BETWEEN 1 AND 5),
  score_documentation INT CHECK (score_documentation BETWEEN 1 AND 5),
  score_teamwork INT CHECK (score_teamwork BETWEEN 1 AND 5),
  score_initiative INT CHECK (score_initiative BETWEEN 1 AND 5),

  -- Section 7: Risk Assessment (1-5)
  score_concerns INT CHECK (score_concerns BETWEEN 1 AND 5),
  score_rehire INT CHECK (score_rehire BETWEEN 1 AND 5),

  -- Section 8: Qualitative
  strengths TEXT,
  development_areas TEXT,
  additional_comments TEXT,

  -- Computed outputs
  total_score INT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('HIGH_RISK', 'CAUTION', 'STRONG', 'EXCEPTIONAL')),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('Hire', 'Hire with Caution', 'Do Not Hire')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
