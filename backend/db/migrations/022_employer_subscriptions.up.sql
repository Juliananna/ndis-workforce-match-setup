CREATE TABLE employer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(employer_id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'biannual', 'annual')),
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  amount_aud_cents INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'cancelled', 'expired')),
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT CHECK (subscription_plan IN ('monthly', 'biannual', 'annual')),
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;
