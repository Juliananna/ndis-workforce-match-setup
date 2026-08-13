CREATE TABLE interview_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(offer_id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES employers(employer_id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX interview_bookings_offer_id_idx ON interview_bookings (offer_id);
CREATE INDEX interview_bookings_employer_id_idx ON interview_bookings (employer_id);
CREATE INDEX interview_bookings_worker_id_idx ON interview_bookings (worker_id);
CREATE INDEX interview_bookings_scheduled_at_idx ON interview_bookings (scheduled_at);
