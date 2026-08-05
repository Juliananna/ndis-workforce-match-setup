CREATE TABLE IF NOT EXISTS schads_award_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL,
  pay_point TEXT NOT NULL,
  classification TEXT NOT NULL,
  hourly_rate NUMERIC(8,4) NOT NULL,
  casual_loading_rate NUMERIC(8,4),
  saturday_rate NUMERIC(8,4),
  sunday_rate NUMERIC(8,4),
  public_holiday_rate NUMERIC(8,4),
  evening_rate NUMERIC(8,4),
  sleepover_rate NUMERIC(8,4),
  notes TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(level, pay_point, effective_date)
);

CREATE INDEX IF NOT EXISTS schads_award_rates_level_idx ON schads_award_rates (level);
CREATE INDEX IF NOT EXISTS schads_award_rates_effective_date_idx ON schads_award_rates (effective_date DESC);

INSERT INTO schads_award_rates (level, pay_point, classification, hourly_rate, casual_loading_rate, saturday_rate, sunday_rate, public_holiday_rate, evening_rate, sleepover_rate, notes, effective_date)
VALUES
  ('1', '1', 'Social and Community Services Level 1 Pay Point 1', 23.91, 29.89, 29.89, 35.87, 47.82, 26.30, 12.00, 'Entry level support worker', '2024-07-01'),
  ('1', '2', 'Social and Community Services Level 1 Pay Point 2', 24.29, 30.36, 30.36, 36.44, 48.58, 26.72, 12.00, NULL, '2024-07-01'),
  ('1', '3', 'Social and Community Services Level 1 Pay Point 3', 24.67, 30.84, 30.84, 37.01, 49.34, 27.14, 12.00, NULL, '2024-07-01'),
  ('2', '1', 'Social and Community Services Level 2 Pay Point 1', 25.41, 31.76, 31.76, 38.12, 50.82, 27.95, 12.00, 'Certificate III qualified', '2024-07-01'),
  ('2', '2', 'Social and Community Services Level 2 Pay Point 2', 25.84, 32.30, 32.30, 38.76, 51.68, 28.42, 12.00, NULL, '2024-07-01'),
  ('2', '3', 'Social and Community Services Level 2 Pay Point 3', 26.27, 32.84, 32.84, 39.41, 52.54, 28.90, 12.00, NULL, '2024-07-01'),
  ('2', '4', 'Social and Community Services Level 2 Pay Point 4', 26.70, 33.38, 33.38, 40.05, 53.40, 29.37, 12.00, NULL, '2024-07-01'),
  ('3', '1', 'Social and Community Services Level 3 Pay Point 1', 27.57, 34.46, 34.46, 41.36, 55.14, 30.33, 12.00, 'Certificate IV or diploma qualified', '2024-07-01'),
  ('3', '2', 'Social and Community Services Level 3 Pay Point 2', 28.10, 35.13, 35.13, 42.15, 56.20, 30.91, 12.00, NULL, '2024-07-01'),
  ('3', '3', 'Social and Community Services Level 3 Pay Point 3', 28.63, 35.79, 35.79, 42.95, 57.26, 31.49, 12.00, NULL, '2024-07-01'),
  ('4', '1', 'Social and Community Services Level 4 Pay Point 1', 29.79, 37.24, 37.24, 44.69, 59.58, 32.77, 12.00, 'Advanced practitioner / team leader', '2024-07-01'),
  ('4', '2', 'Social and Community Services Level 4 Pay Point 2', 30.40, 38.00, 38.00, 45.60, 60.80, 33.44, 12.00, NULL, '2024-07-01'),
  ('4', '3', 'Social and Community Services Level 4 Pay Point 3', 31.01, 38.76, 38.76, 46.52, 62.02, 34.11, 12.00, NULL, '2024-07-01'),
  ('5', '1', 'Social and Community Services Level 5 Pay Point 1', 32.18, 40.23, 40.23, 48.27, 64.36, 35.40, 12.00, 'Coordinator / specialist', '2024-07-01'),
  ('5', '2', 'Social and Community Services Level 5 Pay Point 2', 32.83, 41.04, 41.04, 49.25, 65.66, 36.11, 12.00, NULL, '2024-07-01')
ON CONFLICT (level, pay_point, effective_date) DO NOTHING;
