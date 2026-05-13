CREATE TABLE reference_call_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id UUID NOT NULL REFERENCES worker_references(id) ON DELETE CASCADE,
  officer_user_id UUID NOT NULL REFERENCES users(user_id),
  officer_email TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
  reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_1h_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX reference_call_bookings_reference_id_idx ON reference_call_bookings(reference_id);
CREATE INDEX reference_call_bookings_scheduled_at_idx ON reference_call_bookings(scheduled_at);
CREATE INDEX reference_call_bookings_officer_idx ON reference_call_bookings(officer_user_id);
