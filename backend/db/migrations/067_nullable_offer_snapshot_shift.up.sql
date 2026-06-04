ALTER TABLE offers
  ALTER COLUMN snapshot_shift_date DROP NOT NULL,
  ALTER COLUMN snapshot_shift_start_time DROP NOT NULL,
  ALTER COLUMN snapshot_shift_duration_hours DROP NOT NULL;
