ALTER TABLE worker_documents
  DROP CONSTRAINT IF EXISTS worker_documents_verification_status_check;

ALTER TABLE worker_documents
  ADD CONSTRAINT worker_documents_verification_status_check
  CHECK (verification_status IN ('Pending', 'Verified', 'Missing', 'Expiring Soon', 'Expired'));

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'DOCUMENT_EXPIRING_60',
    'DOCUMENT_EXPIRING_30',
    'DOCUMENT_EXPIRED'
  ));
