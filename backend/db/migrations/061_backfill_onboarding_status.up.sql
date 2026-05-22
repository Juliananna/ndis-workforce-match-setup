ALTER TABLE workers
  ALTER COLUMN onboarding_status SET DEFAULT 'compliance_required';

UPDATE workers
SET onboarding_status = 'compliance_required'
WHERE worker_id NOT IN (
  SELECT DISTINCT worker_id FROM worker_documents
);

UPDATE workers
SET onboarding_status = 'active'
WHERE worker_id IN (
  SELECT DISTINCT worker_id FROM worker_documents
);
