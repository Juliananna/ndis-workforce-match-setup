ALTER TABLE notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'DOCUMENT_EXPIRING_60',
    'DOCUMENT_EXPIRING_30',
    'DOCUMENT_EXPIRED',
    'EMERGENCY_SHIFT_AVAILABLE'
  ));
