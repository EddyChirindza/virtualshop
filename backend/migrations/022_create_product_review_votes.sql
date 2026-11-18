CREATE TABLE product_review_votes (
    review_id   INTEGER NOT NULL REFERENCES product_reviews (id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    vote        VARCHAR(8) NOT NULL CHECK (vote IN ('like', 'dislike')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (review_id, user_id)
);

CREATE INDEX idx_product_review_votes_user_id ON product_review_votes (user_id);
