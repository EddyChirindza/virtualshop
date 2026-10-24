DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'subtotal'
    ) THEN
        ALTER TABLE orders ADD COLUMN subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'discount'
    ) THEN
        ALTER TABLE orders ADD COLUMN discount NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'delivery_fee'
    ) THEN
        ALTER TABLE orders ADD COLUMN delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'coupon_code'
    ) THEN
        ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'notes'
    ) THEN
        ALTER TABLE orders ADD COLUMN notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'order_items' AND column_name = 'subtotal'
    ) THEN
        ALTER TABLE order_items ADD COLUMN subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;
END $$;

UPDATE orders
SET subtotal = total,
    discount = 0,
    delivery_fee = 0,
    coupon_code = NULL,
    notes = NULL
WHERE subtotal = 0 OR subtotal IS NULL;

UPDATE order_items oi
SET subtotal = oi.quantity * oi.unit_price
WHERE oi.subtotal = 0 OR oi.subtotal IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_subtotal_chk') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_subtotal_chk CHECK (subtotal >= 0) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_chk') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_discount_chk CHECK (discount >= 0) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_fee_chk') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_delivery_fee_chk CHECK (delivery_fee >= 0) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_subtotal_chk') THEN
        ALTER TABLE order_items ADD CONSTRAINT order_items_subtotal_chk CHECK (subtotal >= 0) NOT VALID;
    END IF;
END $$;
