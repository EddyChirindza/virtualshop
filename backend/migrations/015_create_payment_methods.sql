CREATE TABLE payment_methods (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type            VARCHAR(20)   NOT NULL
                        CHECK (type IN ('mpesa', 'visa')),
    label           VARCHAR(50),
    provider        VARCHAR(30)   NOT NULL DEFAULT 'mock',
    account_name    VARCHAR(150),
    phone           VARCHAR(20),
    card_brand      VARCHAR(20),
    card_last4      VARCHAR(4),
    expiry_month    SMALLINT      CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year    SMALLINT      CHECK (expiry_year BETWEEN 2000 AND 2100),
    provider_token  TEXT,
    is_default      BOOLEAN       NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT payment_methods_type_fields CHECK (
        (
            type = 'mpesa'
            AND phone IS NOT NULL
            AND card_brand IS NULL
            AND card_last4 IS NULL
            AND expiry_month IS NULL
            AND expiry_year IS NULL
        )
        OR
        (
            type = 'visa'
            AND phone IS NULL
            AND account_name IS NOT NULL
            AND card_brand IS NOT NULL
            AND card_last4 IS NOT NULL
            AND expiry_month IS NOT NULL
            AND expiry_year IS NOT NULL
        )
    )
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods (user_id);

CREATE UNIQUE INDEX idx_payment_methods_unique_mpesa_phone
    ON payment_methods (user_id, phone)
    WHERE type = 'mpesa';

CREATE UNIQUE INDEX idx_payment_methods_provider_token
    ON payment_methods (provider, provider_token)
    WHERE provider_token IS NOT NULL;

CREATE UNIQUE INDEX idx_payment_methods_one_default_per_user
    ON payment_methods (user_id)
    WHERE is_default = true;
