CREATE TABLE favorites (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id      INTEGER       NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

CREATE INDEX idx_favorites_user_id ON favorites (user_id);
