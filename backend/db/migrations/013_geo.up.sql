-- Haversine-based geo-matching using plain DOUBLE PRECISION lat/lng columns.
-- No PostGIS extension required.

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE job_requests
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX workers_geo_idx ON workers (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX job_requests_geo_idx ON job_requests (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
