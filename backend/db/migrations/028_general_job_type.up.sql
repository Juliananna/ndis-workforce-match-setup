ALTER TABLE job_requests
  ADD COLUMN IF NOT EXISTS job_type TEXT NOT NULL DEFAULT 'shift' CHECK (job_type IN ('shift', 'general')),
  ADD COLUMN IF NOT EXISTS job_title TEXT;

ALTER TABLE job_requests
  ALTER COLUMN shift_date DROP NOT NULL,
  ALTER COLUMN shift_start_time DROP NOT NULL,
  ALTER COLUMN shift_duration_hours DROP NOT NULL;

ALTER TABLE job_requests DROP CONSTRAINT IF EXISTS job_requests_shift_duration_hours_check;
ALTER TABLE job_requests ADD CONSTRAINT job_requests_shift_duration_hours_check CHECK (shift_duration_hours IS NULL OR shift_duration_hours > 0);
