-- Repair schema drift in environments where migration 016 was recorded as
-- applied before its order/payment and order/notification links were present.
-- Both columns are nullable so existing rows remain valid.
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'orders_payment_method_id_fkey'
          AND conrelid = 'orders'::regclass
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_payment_method_id_fkey
            FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_payment_method_id
    ON orders (payment_method_id) WHERE payment_method_id IS NOT NULL;

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS order_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notifications_order_id_fkey'
          AND conrelid = 'notifications'::regclass
    ) THEN
        ALTER TABLE notifications
            ADD CONSTRAINT notifications_order_id_fkey
            FOREIGN KEY (order_id) REFERENCES orders (id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_order_id
    ON notifications (order_id) WHERE order_id IS NOT NULL;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check CHECK (
        type IN (
            'new_product',
            'promotion',
            'discount',
            'product_alert',
            'general',
            'order_update'
        )
    );
