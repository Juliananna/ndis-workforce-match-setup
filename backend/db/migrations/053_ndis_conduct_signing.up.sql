CREATE TABLE ndis_conduct_signings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
  annature_envelope_id TEXT NOT NULL,
  annature_recipient_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'declined', 'voided')),
  signed_at TIMESTAMPTZ,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ndis_conduct_signings_worker_idx ON ndis_conduct_signings (worker_id, created_at DESC);
CREATE UNIQUE INDEX ndis_conduct_signings_envelope_idx ON ndis_conduct_signings (annature_envelope_id);
