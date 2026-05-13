CREATE TABLE compliance_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  worker_id UUID REFERENCES workers(worker_id) ON DELETE CASCADE,
  document_id UUID REFERENCES worker_documents(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  template_label TEXT,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX compliance_message_log_worker_idx ON compliance_message_log (worker_id, sent_at DESC);
CREATE INDEX compliance_message_log_document_idx ON compliance_message_log (document_id, sent_at DESC);
