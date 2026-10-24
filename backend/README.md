# VirtualShop API development

## Backend tests

Run the validator and service tests from this directory with Node's built-in
test runner:

```sh
node --test tests/auth-validators.test.js tests/users-validators.test.js tests/notifications.validators.test.js
node --test tests/products-search.test.js tests/notifications.service.test.js
```

The configuration loader uses `dotenv`'s default behavior, which reads
`backend/.env` relative to the current working directory, then validates the
required database and JWT variables. This repository does not include a
`.env.example` or a separate test environment file. The product search and
notification service tests stub the database module and do not require
PostgreSQL configuration.

`tests/favorites.test.js` connects to PostgreSQL through the normal database
pool. Its setup issues unqualified `DELETE` statements against `favorites`,
`products`, `categories`, and `users`, then inserts fixture rows. Do not run it
against development or production data. To run it safely, create a dedicated,
disposable PostgreSQL database, apply the project's migrations to that database,
and set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and
`JWT_SECRET` in a private `backend/.env` (or provide them in the process
environment). Verify `DB_NAME` points only to that disposable test database
before running `node --test tests/favorites.test.js`. No database is configured
in this checkout, so the favorites tests have not been run here. There is no
`.env.example`; do not copy production credentials into a test configuration.

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

## Flutter targets

Run these commands from `app/customer_app` in the Flutter repository. Keep the
`/api` suffix in the base URL:

```sh
# Android emulator
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api

# Physical Android device on the same trusted LAN
flutter run --dart-define=API_BASE_URL=http://<PC_LAN_IP>:3000/api

# Flutter Web in Chrome
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000/api
```

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
Native Android requests are not subject to browser CORS. For Flutter Web, set
`CORS_ORIGINS` in the backend environment to the exact development origin if it
is not a localhost origin, for example `http://localhost:5000`.

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
