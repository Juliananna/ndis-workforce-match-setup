CREATE TABLE worker_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
  package TEXT NOT NULL CHECK (package IN ('docs_only', 'refs_only', 'bundle')),
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent TEXT,
  amount_aud_cents INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS priority_boost BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS docs_verified_purchased BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refs_purchased BOOLEAN NOT NULL DEFAULT FALSE;
