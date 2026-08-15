CREATE TABLE offer_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(offer_id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES employers(employer_id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Fulfilled', 'Cancelled')),
  fulfilled_url TEXT,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX offer_document_requests_offer_id_idx ON offer_document_requests (offer_id);
CREATE INDEX offer_document_requests_worker_id_idx ON offer_document_requests (worker_id);
CREATE INDEX offer_document_requests_employer_id_idx ON offer_document_requests (employer_id);
