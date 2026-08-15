ALTER TABLE interview_bookings
  ADD COLUMN suggested_slots JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN confirmed_slot TIMESTAMPTZ,
  ADD COLUMN worker_confirmed_at TIMESTAMPTZ;

ALTER TABLE interview_bookings
  DROP CONSTRAINT interview_bookings_status_check;

ALTER TABLE interview_bookings
  ADD CONSTRAINT interview_bookings_status_check
    CHECK (status IN ('AwaitingWorker', 'Scheduled', 'Completed', 'Cancelled'));

ALTER TABLE interview_bookings
  ALTER COLUMN scheduled_at DROP NOT NULL;

ALTER TABLE interview_bookings
  ALTER COLUMN status SET DEFAULT 'AwaitingWorker';

ALTER TABLE interview_requests
  ADD COLUMN suggested_slots JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN confirmed_slot TIMESTAMPTZ,
  ADD COLUMN worker_confirmed_at TIMESTAMPTZ;

ALTER TABLE interview_requests
  DROP CONSTRAINT interview_requests_status_check;

ALTER TABLE interview_requests
  ADD CONSTRAINT interview_requests_status_check
    CHECK (status IN ('AwaitingWorker', 'Confirmed', 'Declined', 'Cancelled'));

ALTER TABLE interview_requests
  ALTER COLUMN scheduled_at DROP NOT NULL;

ALTER TABLE interview_requests
  ALTER COLUMN status SET DEFAULT 'AwaitingWorker';
