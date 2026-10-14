# VirtualShop API development

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