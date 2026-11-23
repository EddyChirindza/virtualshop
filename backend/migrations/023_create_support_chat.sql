ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('customer', 'delivery', 'admin', 'support'));

CREATE TABLE support_conversations (
    id                      SERIAL PRIMARY KEY,
    customer_id             INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status                  VARCHAR(16) NOT NULL DEFAULT 'bot'
                                CHECK (status IN ('bot', 'waiting', 'active', 'closed')),
    assigned_support_id     INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_support_conversations_one_open_per_customer
    ON support_conversations (customer_id)
    WHERE status <> 'closed';

CREATE INDEX idx_support_conversations_queue
    ON support_conversations (status, updated_at DESC)
    WHERE status IN ('waiting', 'active');

CREATE TABLE support_messages (
    id                  SERIAL PRIMARY KEY,
    conversation_id     INTEGER NOT NULL REFERENCES support_conversations (id) ON DELETE CASCADE,
    sender_type         VARCHAR(16) NOT NULL
                            CHECK (sender_type IN ('customer', 'bot', 'support')),
    sender_user_id      INTEGER REFERENCES users (id) ON DELETE SET NULL,
    body                TEXT NOT NULL
                            CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
    handoff_available   BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (sender_type = 'bot' AND sender_user_id IS NULL)
        OR (sender_type <> 'bot' AND sender_user_id IS NOT NULL)
    )
);

CREATE INDEX idx_support_messages_conversation
    ON support_messages (conversation_id, id);
