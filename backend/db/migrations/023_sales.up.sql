CREATE TABLE sales_agents (
  user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(user_id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE sales_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed_aud_cents')),
  discount_value INT NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('employer_subscription', 'worker_purchase', 'all')),
  max_uses INT,
  uses_count INT NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sales_demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_name TEXT NOT NULL,
  prospect_email TEXT NOT NULL,
  prospect_company TEXT,
  prospect_phone TEXT,
  notes TEXT,
  demo_type TEXT NOT NULL DEFAULT 'standard' CHECK (demo_type IN ('standard', 'employer', 'worker', 'full_platform')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  conducted_by UUID REFERENCES users(user_id),
  outcome TEXT,
  follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_account_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
