ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX employers_geo_idx ON employers (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
