-- Access rule: per employer-worker relationship.
-- Once any offer between employer E and worker W reaches Accepted status,
-- employer E may access ALL compliance documents uploaded by worker W.
-- This is the simplest secure rule: one accepted agreement = full document access.
-- Revoking access requires no special logic; just check for any accepted offer.

CREATE TABLE document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(employer_id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES worker_documents(id) ON DELETE CASCADE,
  -- 'LIST' when employer lists documents; 'DOWNLOAD' when a signed URL is generated
  access_type TEXT NOT NULL CHECK (access_type IN ('LIST', 'DOWNLOAD')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX document_access_log_employer_worker_idx ON document_access_log (employer_id, worker_id);
CREATE INDEX document_access_log_document_idx ON document_access_log (document_id);
