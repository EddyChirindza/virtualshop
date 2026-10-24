ALTER TABLE users
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS gender VARCHAR(30),
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE addresses
    ADD COLUMN IF NOT EXISTS province VARCHAR(100),
    ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "number" VARCHAR(30),
    ADD COLUMN IF NOT EXISTS reference VARCHAR(500);

WITH ranked_defaults AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS position
    FROM addresses
    WHERE is_default = true
)
UPDATE addresses
SET is_default = false
FROM ranked_defaults
WHERE addresses.id = ranked_defaults.id
  AND ranked_defaults.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default_per_user
    ON addresses (user_id)
    WHERE is_default = true;