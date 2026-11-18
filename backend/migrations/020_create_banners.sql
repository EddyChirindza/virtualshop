-- Sistema de banners promocionais (público + admin)
CREATE TABLE banners (
    id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,

    title_pt VARCHAR(150) NOT NULL,
    title_en VARCHAR(150),

    subtitle_pt VARCHAR(250),
    subtitle_en VARCHAR(250),

    image_url TEXT NOT NULL,
    mobile_image_url TEXT,

    background_color VARCHAR(7) NOT NULL DEFAULT '#111827'
        CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$'),

    title_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF'
        CHECK (title_color ~ '^#[0-9A-Fa-f]{6}$'),

    subtitle_color VARCHAR(7) DEFAULT '#E5E7EB'
        CHECK (
            subtitle_color IS NULL
            OR subtitle_color ~ '^#[0-9A-Fa-f]{6}$'
        ),

    button_text_pt VARCHAR(50),
    button_text_en VARCHAR(50),

    button_color VARCHAR(7)
        CHECK (
            button_color IS NULL
            OR button_color ~ '^#[0-9A-Fa-f]{6}$'
        ),

    button_text_color VARCHAR(7)
        CHECK (
            button_text_color IS NULL
            OR button_text_color ~ '^#[0-9A-Fa-f]{6}$'
        ),

    alignment VARCHAR(10) NOT NULL DEFAULT 'left'
        CHECK (alignment IN ('left', 'center', 'right')),

    overlay_opacity NUMERIC(4,3) NOT NULL DEFAULT 0.000
        CHECK (overlay_opacity BETWEEN 0 AND 1),

    banner_type VARCHAR(30) NOT NULL DEFAULT 'promotion'
        CHECK (
            banner_type IN (
                'promotion',
                'category',
                'product',
                'announcement'
            )
        ),

    destination_type VARCHAR(20) NOT NULL DEFAULT 'none'
        CHECK (
            destination_type IN (
                'none',
                'product',
                'category',
                'url',
                'product_list'
            )
        ),

    product_id INTEGER,
    category_id INTEGER,

    destination_url TEXT
        CHECK (
            destination_url IS NULL
            OR destination_url ~ '^(https?://|/)'
        ),

    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT banners_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
    CONSTRAINT banners_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,

    CONSTRAINT banners_destination_matches CHECK (
        (
            destination_type = 'none'
            AND product_id IS NULL
            AND category_id IS NULL
            AND destination_url IS NULL
        )
        OR
        (
            destination_type = 'product'
            AND product_id IS NOT NULL
            AND category_id IS NULL
            AND destination_url IS NULL
        )
        OR
        (
            destination_type = 'category'
            AND category_id IS NOT NULL
            AND product_id IS NULL
            AND destination_url IS NULL
        )
        OR
        (
            destination_type = 'url'
            AND destination_url IS NOT NULL
            AND product_id IS NULL
            AND category_id IS NULL
        )
        OR
        (
            destination_type = 'product_list'
            AND product_id IS NULL
            AND category_id IS NULL
            AND destination_url IS NULL
        )
    ),

    CONSTRAINT banners_period_valid CHECK (
        expires_at IS NULL
        OR starts_at IS NULL
        OR expires_at > starts_at
    )
);

CREATE TABLE banner_products (
    banner_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (banner_id, product_id),

    CONSTRAINT banner_products_banner_id_fkey
        FOREIGN KEY (banner_id) REFERENCES banners (id) ON DELETE CASCADE,
    CONSTRAINT banner_products_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
);

CREATE INDEX idx_banners_public_feed
    ON banners (sort_order, id)
    WHERE is_active = true;
CREATE INDEX idx_banners_schedule
    ON banners (starts_at, expires_at)
    WHERE is_active = true;
CREATE INDEX idx_banners_product_id
    ON banners (product_id)
    WHERE product_id IS NOT NULL;
CREATE INDEX idx_banners_category_id
    ON banners (category_id)
    WHERE category_id IS NOT NULL;
CREATE INDEX idx_banner_products_banner_order
    ON banner_products (banner_id, sort_order, product_id);
CREATE INDEX idx_banner_products_product_id
    ON banner_products (product_id);
