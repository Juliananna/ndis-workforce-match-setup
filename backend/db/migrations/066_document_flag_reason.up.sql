ALTER TABLE worker_documents
  ADD COLUMN IF NOT EXISTS flag_reason TEXT
    CHECK (flag_reason IN ('expired', 'unclear', 'wrong_doc', 'missing_info'));

ALTER TABLE worker_documents
  DROP CONSTRAINT IF EXISTS worker_documents_verification_status_check;

ALTER TABLE worker_documents
  ADD CONSTRAINT worker_documents_verification_status_check
    CHECK (verification_status IN ('Pending', 'Verified', 'Missing', 'Expiring Soon', 'Expired', 'Flagged'));
