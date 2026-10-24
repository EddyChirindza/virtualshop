CREATE TABLE categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    slug            VARCHAR(120)  NOT NULL UNIQUE,
    icon_url        TEXT,
    parent_id       INTEGER       REFERENCES categories (id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent_id ON categories (parent_id);
