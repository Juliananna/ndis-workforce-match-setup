CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(offer_id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('EMPLOYER', 'WORKER')),
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
  read_by_employer_at TIMESTAMPTZ,
  read_by_worker_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_offer_id_idx ON messages (offer_id, created_at);
CREATE INDEX messages_sender_idx ON messages (sender_user_id);
