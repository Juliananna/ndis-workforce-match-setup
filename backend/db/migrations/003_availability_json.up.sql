ALTER TABLE worker_availability
  ALTER COLUMN available_days TYPE TEXT USING array_to_json(available_days)::text,
  ALTER COLUMN available_days SET DEFAULT '[]',
  ALTER COLUMN preferred_shift_types TYPE TEXT USING array_to_json(preferred_shift_types)::text,
  ALTER COLUMN preferred_shift_types SET DEFAULT '[]';
