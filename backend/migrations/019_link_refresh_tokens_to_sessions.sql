-- Give each legacy refresh-token chain a session identity before enforcing
-- the user/session relationship. Existing access tokens are resolved through
-- their legacy refresh-token id by the authentication middleware.
-- Apply during an auth-write maintenance window; both tables are locked in
-- the same order used by password-change revocation.
LOCK TABLE user_sessions, refresh_tokens IN ACCESS EXCLUSIVE MODE;

WITH unmapped_tokens AS (
    SELECT
        id AS token_id,
        user_id,
        expires_at,
        revoked_at,
        created_at,
        gen_random_uuid() AS session_id
    FROM refresh_tokens
    WHERE session_id IS NULL
),
inserted_sessions AS (
    INSERT INTO user_sessions (id, user_id, expires_at, revoked_at, created_at)
    SELECT session_id, user_id, expires_at, revoked_at, created_at
    FROM unmapped_tokens
    RETURNING id
),
session_links AS (
    SELECT unmapped_tokens.token_id, inserted_sessions.id AS session_id
    FROM unmapped_tokens
    JOIN inserted_sessions ON inserted_sessions.id = unmapped_tokens.session_id
)
UPDATE refresh_tokens
SET session_id = session_links.session_id
FROM session_links
WHERE refresh_tokens.id = session_links.token_id;

ALTER TABLE user_sessions
    ADD CONSTRAINT user_sessions_id_user_id_unique UNIQUE (id, user_id);

ALTER TABLE refresh_tokens
    DROP CONSTRAINT IF EXISTS refresh_tokens_session_id_fkey;

ALTER TABLE refresh_tokens
    ALTER COLUMN session_id SET NOT NULL,
    ADD CONSTRAINT refresh_tokens_session_user_fkey
        FOREIGN KEY (session_id, user_id)
        REFERENCES user_sessions (id, user_id)
        ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_revoked
    ON refresh_tokens (session_id, revoked_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_one_active_per_session
    ON refresh_tokens (session_id)
    WHERE revoked_at IS NULL;
