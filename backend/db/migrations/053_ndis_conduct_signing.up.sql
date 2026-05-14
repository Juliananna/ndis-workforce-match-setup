CREATE TABLE ndis_conduct_signings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
  signature_data_url TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ndis_conduct_signings_worker_idx ON ndis_conduct_signings (worker_id);
