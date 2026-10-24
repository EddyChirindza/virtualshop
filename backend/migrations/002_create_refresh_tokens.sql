-- Guardamos apenas o HASH do refresh token, nunca o valor em texto simples.
CREATE TABLE refresh_tokens (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash      TEXT          NOT NULL UNIQUE,
    user_agent      TEXT,
    ip_address      VARCHAR(45),
    expires_at      TIMESTAMPTZ   NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
