CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150)  NOT NULL,
    description     TEXT,
    price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock           INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url       TEXT,
    category_id     INTEGER       REFERENCES categories (id) ON DELETE SET NULL,
    rating          NUMERIC(2, 1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    is_popular      BOOLEAN       NOT NULL DEFAULT false,
    is_new_arrival  BOOLEAN       NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_is_popular ON products (is_popular) WHERE is_popular = true;
CREATE INDEX idx_products_is_new_arrival ON products (is_new_arrival) WHERE is_new_arrival = true;
