CREATE TABLE addresses (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    label           VARCHAR(50),
    street          TEXT          NOT NULL,
    city            VARCHAR(100)  NOT NULL,
    geo_lat         NUMERIC(9, 6),
    geo_lng         NUMERIC(9, 6),
    is_default      BOOLEAN       NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user_id ON addresses (user_id);
