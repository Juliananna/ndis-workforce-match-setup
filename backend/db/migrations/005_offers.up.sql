CREATE TABLE offers (
  offer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES job_requests(job_id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES employers(employer_id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,

  -- Snapshot of job details at time of offer
  snapshot_location TEXT NOT NULL,
  snapshot_shift_date DATE NOT NULL,
  snapshot_shift_start_time TEXT NOT NULL,
  snapshot_shift_duration_hours DOUBLE PRECISION NOT NULL,
  snapshot_support_type_tags TEXT[] NOT NULL DEFAULT '{}',
  snapshot_client_notes TEXT,
  snapshot_behavioural_considerations TEXT,
  snapshot_medical_requirements TEXT,

  -- Rate negotiation
  offered_rate DOUBLE PRECISION NOT NULL CHECK (offered_rate >= 0),
  negotiated_rate DOUBLE PRECISION CHECK (negotiated_rate >= 0),
  latest_proposed_by TEXT CHECK (latest_proposed_by IN ('EMPLOYER', 'WORKER')),

  -- Status
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Declined', 'Negotiating', 'Cancelled')),

  additional_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX offers_job_id_idx ON offers (job_id);
CREATE INDEX offers_employer_id_idx ON offers (employer_id);
CREATE INDEX offers_worker_id_idx ON offers (worker_id);
CREATE INDEX offers_status_idx ON offers (status);

CREATE TABLE offer_negotiation_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(offer_id) ON DELETE CASCADE,
  actor TEXT NOT NULL CHECK (actor IN ('EMPLOYER', 'WORKER')),
  event_type TEXT NOT NULL CHECK (event_type IN ('OFFER_SENT', 'ACCEPTED', 'DECLINED', 'RATE_PROPOSED', 'CANCELLED')),
  rate DOUBLE PRECISION,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX offer_negotiation_events_offer_id_idx ON offer_negotiation_events (offer_id);
