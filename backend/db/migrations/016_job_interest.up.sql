CREATE TABLE job_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES job_requests(job_id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, worker_id)
);

CREATE INDEX job_interest_job_idx ON job_interest (job_id);
CREATE INDEX job_interest_worker_idx ON job_interest (worker_id);
