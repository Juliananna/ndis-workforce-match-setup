ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS service_areas TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS organisation_size TEXT,
  ADD COLUMN IF NOT EXISTS services_provided TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE support_type_tags (
  tag TEXT PRIMARY KEY
);

INSERT INTO support_type_tags (tag) VALUES
  ('Autism support'),
  ('Intellectual disability'),
  ('Mobility support'),
  ('Personal care'),
  ('Behavioural support'),
  ('Community participation'),
  ('Medication administration'),
  ('Complex care'),
  ('PEG feeding'),
  ('Wound care'),
  ('Mental health support')
ON CONFLICT DO NOTHING;

CREATE TABLE job_requests (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(employer_id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  shift_date DATE NOT NULL,
  shift_start_time TEXT NOT NULL,
  shift_duration_hours DOUBLE PRECISION NOT NULL CHECK (shift_duration_hours > 0),
  support_type_tags TEXT[] NOT NULL DEFAULT '{}',
  client_notes TEXT,
  gender_preference TEXT CHECK (gender_preference IN ('Male', 'Female', 'No preference')),
  age_range_preference TEXT,
  behavioural_considerations TEXT,
  medical_requirements TEXT,
  weekday_rate DOUBLE PRECISION NOT NULL CHECK (weekday_rate >= 0),
  weekend_rate DOUBLE PRECISION NOT NULL CHECK (weekend_rate >= 0),
  public_holiday_rate DOUBLE PRECISION NOT NULL CHECK (public_holiday_rate >= 0),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Open', 'Closed', 'Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX job_requests_employer_id_idx ON job_requests (employer_id);
CREATE INDEX job_requests_status_idx ON job_requests (status);
