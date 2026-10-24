CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(150)  NOT NULL,
    phone           VARCHAR(20)   NOT NULL UNIQUE,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    password_hash   TEXT          NOT NULL,
    role            VARCHAR(20)   NOT NULL DEFAULT 'customer'
                        CHECK (role IN ('customer', 'delivery', 'admin')),
    is_active       BOOLEAN       NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_phone ON users (phone);
