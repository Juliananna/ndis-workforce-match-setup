CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'DOCUMENT_EXPIRING_60',
    'DOCUMENT_EXPIRING_30',
    'DOCUMENT_EXPIRED'
  )),
  document_id UUID REFERENCES worker_documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX notifications_read_at_idx ON notifications (user_id, read_at) WHERE read_at IS NULL;

-- Prevents duplicate notifications for the same document and type.
CREATE UNIQUE INDEX notifications_dedup_idx
  ON notifications (document_id, type);
