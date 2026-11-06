# VirtualShop API development

## Backend tests

Run the validator and service tests from this directory with Node's built-in
test runner:

```sh
node --test tests/auth-validators.test.js tests/users-validators.test.js tests/notifications.validators.test.js
node --test tests/products-search.test.js tests/notifications.service.test.js
node --test tests/uploads-lifecycle.test.js tests/product-image-lifecycle.test.js tests/user-photo-lifecycle.test.js
```

The configuration loader uses `dotenv`'s default behavior, which reads
`backend/.env` relative to the current working directory, then validates the
required database and JWT variables. This repository does not include a
`.env.example` or a separate test environment file. The product search and
notification service tests stub the database module and do not require
PostgreSQL configuration.

PostgreSQL integration tests use the normal database pool. Several suites issue
table-wide `DELETE` statements, so the shared test helper blocks them unless
`NODE_ENV=test`, `TEST_DB_NAME`, and `DB_NAME` all agree and the database name
contains `test`. Create a dedicated, disposable PostgreSQL database and apply
migrations to that database only. Configure `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `NODE_ENV=test`, and
`TEST_DB_NAME=<the exact test database name>` in a private test environment.
For example, if the disposable database is `virtualshop_test`, both `DB_NAME`
and `TEST_DB_NAME` must be `virtualshop_test`. The guard runs immediately before
the first test database operation. Never set these variables to development or
production credentials. No database migration or cleanup should be run against
the main application database. There is no `.env.example`; do not copy
production credentials into a test configuration.

## Database migrations

Run all pending migrations in filename order with:

```sh
npm run migrate
```

To apply exactly one migration, pass its filename from `backend/migrations`:

```sh
npm run migrate -- --only 018_create_user_sessions.sql
```

The selected migration is still checked against `schema_migrations`; an
already-applied migration is skipped. When selecting one migration, the runner
refuses to apply it if any earlier migration in filename order is still
pending. Each migration runs in its own transaction, and a PostgreSQL
transaction-level advisory lock serializes concurrent migration runners.
Applying one migration does not apply any other pending migration.

If `COMMIT` reports an error, the transaction outcome may be ambiguous. Check
`schema_migrations` and the schema before attempting that migration again; the
runner does not retry it automatically.

## Product images

Products store an ordered `image_urls` array and retain `image_url` as the
primary image for older clients. Migration `014_add_product_images.sql` adds
the array and copies each existing primary image into it. Apply it with
`npm run migrate -- --only 014_add_product_images.sql` after configuring a
database; do not run migrations against a database unless it is the intended
environment. Product image uploads are
written to `backend/uploads/products`, so deployments must keep that directory
on persistent storage and serve `/uploads`. The admin accepts up to 20 images
per product, with a 5 MB per-image upload limit.

## Upload lifecycle and cleanup

Updating or deleting a product releases its previous local images after the
database change succeeds. Replacing a profile photo also releases the previous
avatar. A file is only removed when no product, user avatar or category icon
still references it; remote URLs are never touched.

Uploads can still become orphaned when a request fails after the file is
written. Run the cleanup command periodically, for example from cron:

```sh
npm run cleanup:uploads -- --dry-run
npm run cleanup:uploads
npm run cleanup:uploads -- --min-age-hours=48
```

The command scans `uploads/products` and `uploads/avatars`, compares files with
local upload URLs stored in PostgreSQL, and deletes only unreferenced files.
The default grace period is 24 hours so uploads still being attached to a new
product are not removed. `--dry-run` reports candidates without deleting them.

## Start the API

From this directory, start the backend with:

```sh
npm run dev
```

The development server listens on `0.0.0.0:3000` by default. Override `HOST` or
`PORT` through the backend environment when needed. Outside development, the
default host is `127.0.0.1`; set `HOST` explicitly when a deployment requires a
different binding. PostgreSQL connection settings remain in the backend `.env`
and the database should not be exposed to mobile devices.

## Customer Web and Flutter targets

The browser customer storefront is React at `app/customer_web`. Flutter
`app/customer_app` is for Android and iOS. Run the React Admin Web
(`app/admin_web_2.0`) locally with Vite or through the optional Docker Compose
`admin` profile. See the root README for setup and commands. Keep `/api` at the
end of each API base URL.

Find the PC's current LAN IPv4 address on Linux with:

```sh
ip -4 -o addr show scope global
```

Use the address on the same Wi-Fi/LAN as the phone, not a Docker bridge address.
For example, `192.168.1.205` produces `http://192.168.1.205:3000/api`. The
address can change when the PC reconnects to the network; pass the current value
at run time rather than committing it in Flutter source.

## Connectivity checks

The liveness endpoint does not query the database:

```sh
curl http://localhost:3000/api/health
```

The readiness endpoint also checks PostgreSQL and returns only a generic status:

```sh
curl http://localhost:3000/api/health/ready
```

From a physical device, open `http://<PC_LAN_IP>:3000/api/health` in its browser.
Native Android requests are not subject to browser CORS. For browser clients
served from a non-localhost origin, set `CORS_ORIGINS` in the backend
environment to the exact development or deployment origin.

If UFW is enabled, allow only the API port from the trusted development subnet,
substituting that subnet for the example:

```sh
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp
```

Do not expose port `5432`. If the phone still cannot reach the health URL, check
that both devices are on the same non-isolated Wi-Fi, confirm the PC's current
LAN address, and check the host firewall. If Android reports a cleartext HTTP
policy error, keep the HTTP allowance development-only and verify the debug-app
policy; do not disable TLS checks or weaken release security.
