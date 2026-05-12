DROP INDEX IF EXISTS notifications_dedup_idx;

CREATE UNIQUE INDEX notifications_dedup_idx
  ON notifications (document_id, type)
  WHERE type != 'ADMIN_DOCUMENT_MESSAGE';
