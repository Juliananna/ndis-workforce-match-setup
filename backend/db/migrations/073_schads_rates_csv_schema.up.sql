ALTER TABLE schads_award_rates
  ADD COLUMN IF NOT EXISTS award_code TEXT NOT NULL DEFAULT 'MA000100',
  ADD COLUMN IF NOT EXISTS stream_code TEXT,
  ADD COLUMN IF NOT EXISTS stream_name TEXT,
  ADD COLUMN IF NOT EXISTS classification_code TEXT,
  ADD COLUMN IF NOT EXISTS employment_basis TEXT NOT NULL DEFAULT 'PERMANENT',
  ADD COLUMN IF NOT EXISTS weekly_rate NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS afternoon_shift_rate NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS night_shift_rate NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS source_url TEXT;

ALTER TABLE schads_award_rates DROP CONSTRAINT IF EXISTS schads_award_rates_level_pay_point_effective_date_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'schads_award_rates_classification_code_employment_basis_date_key'
  ) THEN
    ALTER TABLE schads_award_rates
      ADD CONSTRAINT schads_award_rates_classification_code_employment_basis_date_key
      UNIQUE (classification_code, employment_basis, effective_date)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS schads_award_rates_stream_code_idx ON schads_award_rates (stream_code);
CREATE INDEX IF NOT EXISTS schads_award_rates_employment_basis_idx ON schads_award_rates (employment_basis);
