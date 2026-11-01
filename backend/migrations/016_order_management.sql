-- Gestão de pedidos: novos estados, pagamento/entrega e notificações ligadas a pedidos.

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method_id INTEGER REFERENCES payment_methods (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) NOT NULL DEFAULT 'store_pickup',
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

UPDATE orders SET status = 'accepted' WHERE status = 'confirmed';
UPDATE orders SET status = 'completed' WHERE status = 'delivered';

ALTER TABLE orders
    ADD CONSTRAINT orders_status_check CHECK (
        status IN (
            'pending',
            'accepted',
            'rejected',
            'preparing',
            'ready_for_pickup',
            'out_for_delivery',
            'completed',
            'cancelled'
        )
    );

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_delivery_method_check;
ALTER TABLE orders
    ADD CONSTRAINT orders_delivery_method_check CHECK (
        delivery_method IN ('home_delivery', 'store_pickup')
    );

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders
    ADD CONSTRAINT orders_payment_status_check CHECK (
        payment_status IN ('pending', 'paid', 'failed', 'refund_required', 'refunded')
    );

-- O checkout existente simula aprovação imediata do pagamento. Os pedidos
-- antigos não guardavam este estado, por isso assumimos o fluxo simulado pago.
UPDATE orders
SET delivery_method = CASE WHEN address_id IS NULL THEN 'store_pickup' ELSE 'home_delivery' END
WHERE delivery_method = 'store_pickup' AND address_id IS NOT NULL;

UPDATE orders SET payment_status = 'paid' WHERE payment_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_status_created
    ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_id
    ON orders (payment_method_id) WHERE payment_method_id IS NOT NULL;

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders (id) ON DELETE CASCADE;

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

CREATE INDEX IF NOT EXISTS idx_notifications_order_id
    ON notifications (order_id) WHERE order_id IS NOT NULL;
