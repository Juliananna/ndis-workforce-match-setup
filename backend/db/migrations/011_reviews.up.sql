CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(offer_id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('EMPLOYER', 'WORKER')),
  reviewee_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reviewee_role TEXT NOT NULL CHECK (reviewee_role IN ('EMPLOYER', 'WORKER')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (char_length(comment) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One review per party per offer
  UNIQUE (offer_id, reviewer_user_id)
);

CREATE INDEX reviews_reviewee_idx ON reviews (reviewee_user_id);
CREATE INDEX reviews_offer_id_idx ON reviews (offer_id);
