ALTER TABLE sales_discounts
  ADD COLUMN IF NOT EXISTS grants_upgrades TEXT[] NOT NULL DEFAULT '{}';
