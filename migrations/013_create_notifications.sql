CREATE TABLE notifications (
    id                  BIGSERIAL PRIMARY KEY,
    title               VARCHAR(100) NOT NULL,
    message             VARCHAR(500) NOT NULL,
    type                VARCHAR(30) NOT NULL
                            CHECK (type IN ('new_product', 'promotion', 'discount', 'product_alert', 'general')),
    product_id          INTEGER REFERENCES products (id) ON DELETE SET NULL,
    recipient_scope     VARCHAR(20) NOT NULL DEFAULT 'all_customers'
                            CHECK (recipient_scope IN ('all_customers', 'user')),
    recipient_user_id   INTEGER REFERENCES users (id) ON DELETE CASCADE,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'published', 'archived')),
    idempotency_key     VARCHAR(200) UNIQUE,
    starts_at           TIMESTAMPTZ,
    expires_at           TIMESTAMPTZ,
    created_by          INTEGER REFERENCES users (id) ON DELETE SET NULL,
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT notifications_target_matches_scope CHECK (
      (recipient_scope = 'all_customers' AND recipient_user_id IS NULL) OR
      (recipient_scope = 'user' AND recipient_user_id IS NOT NULL)
    ),
    CONSTRAINT notifications_expiry_after_start CHECK (
      starts_at IS NULL OR expires_at IS NULL OR expires_at > starts_at
    )
);

CREATE TABLE notification_reads (
    notification_id BIGINT NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX idx_notifications_published_feed
    ON notifications (published_at DESC, id DESC)
    WHERE status = 'published';
CREATE INDEX idx_notifications_targeted_feed
    ON notifications (recipient_user_id, published_at DESC, id DESC)
    WHERE status = 'published' AND recipient_scope = 'user';
CREATE INDEX idx_notifications_product_id
    ON notifications (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_notification_reads_user
    ON notification_reads (user_id, read_at DESC);
