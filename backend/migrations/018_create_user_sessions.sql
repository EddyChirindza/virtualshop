CREATE TABLE user_sessions (
    id              UUID          PRIMARY KEY,
    user_id         INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    revoked_at      TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ   NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions (user_id);

ALTER TABLE refresh_tokens
    ADD COLUMN session_id UUID REFERENCES user_sessions (id) ON DELETE CASCADE;

CREATE INDEX idx_refresh_tokens_session_id ON refresh_tokens (session_id);
