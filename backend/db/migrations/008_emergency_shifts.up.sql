ALTER TABLE job_requests
  ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ;

CREATE INDEX job_requests_emergency_idx ON job_requests (is_emergency, status)
  WHERE is_emergency = TRUE;

CREATE TABLE emergency_shift_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES job_requests(job_id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, worker_id)
);

CREATE INDEX emergency_shift_responses_job_id_idx ON emergency_shift_responses (job_id);
CREATE INDEX emergency_shift_responses_worker_id_idx ON emergency_shift_responses (worker_id);
