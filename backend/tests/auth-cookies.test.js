const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { pool, query } = require('../src/config/db');
const app = require('../src/app');
const env = require('../src/config/env');
const authService = require('../src/modules/auth/auth.service');
const {
  assertIsolatedTestDatabase,
  assertConnectedTestDatabase,
} = require('../test-support/assert-test-database');
const { REFRESH_COOKIE_NAME } = require('../src/utils/auth_cookie');

const ORIGIN = 'http://localhost:5173';

async function postJson(url, body, headers = {}) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function cookiePair(setCookie) {
  return setCookie.split(';')[0];
}

function findRefreshCookie(response) {
  const setCookies = response.headers.getSetCookie();
  return setCookies.find((cookie) => cookie.startsWith(`${REFRESH_COOKIE_NAME}=`));
}

test('refresh token é gerido por cookie HttpOnly, com rotação e logout', async (t) => {
  assertIsolatedTestDatabase();
  await assertConnectedTestDatabase(pool);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const createdUserIds = [];
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (createdUserIds.length) {
      await query('DELETE FROM users WHERE id = ANY($1::int[])', [createdUserIds]);
    }
    await pool.end();
  });

  const authBase = `http://127.0.0.1:${server.address().port}/api/auth`;
  const unique = crypto.randomUUID().slice(0, 8);
  const phone = `+25889${Date.now().toString().slice(-8)}`;
  const password = 'Password123';
  const email = `cookie-${unique}@example.com`;

  const registered = await authService.register({
    full_name: 'Cookie Admin',
    phone,
    email,
    password,
  }, {});
  const userId = registered.user.id;
  createdUserIds.push(userId);
  await query("UPDATE users SET role = 'admin' WHERE id = $1", [userId]);

  const login = await postJson(`${authBase}/login`, {
    identifier: email,
    password,
    adminOnly: true,
  });
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.ok(loginBody.data.token);
  assert.ok(
    loginBody.data.refreshToken,
    'corpo mantém refreshToken para compatibilidade com clientes existentes'
  );

  const loginCookie = findRefreshCookie(login);
  assert.ok(loginCookie, 'login deve emitir o cookie de refresh');
  assert.match(loginCookie, /HttpOnly/i);
  assert.match(loginCookie, /Path=\/api\/auth/i);
  assert.match(loginCookie, /SameSite=Lax/i);
  if (env.authCookie.secure) {
    assert.match(loginCookie, /;\s*Secure/i);
  } else {
    assert.doesNotMatch(loginCookie, /;\s*Secure/i);
  }

  const firstCookie = cookiePair(loginCookie);
  const rotated = await fetch(`${authBase}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Cookie: firstCookie,
    },
    body: JSON.stringify({ adminOnly: true }),
  });
  assert.equal(rotated.status, 200);
  const rotatedBody = await rotated.json();
  assert.ok(rotatedBody.data.token);
  assert.ok(rotatedBody.data.refreshToken);

  const rotatedCookie = findRefreshCookie(rotated);
  assert.ok(rotatedCookie, 'refresh deve renovar o cookie');
  assert.notEqual(cookiePair(rotatedCookie), firstCookie);

  const secondCookie = cookiePair(rotatedCookie);
  const logout = await fetch(`${authBase}/logout`, {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      Cookie: secondCookie,
    },
  });
  assert.equal(logout.status, 200);
  const clearedCookie = findRefreshCookie(logout);
  assert.ok(clearedCookie, 'logout deve limpar o cookie de refresh');
  assert.match(clearedCookie, /Expires=Thu, 01 Jan 1970/i);
  assert.match(clearedCookie, /HttpOnly/i);

  const refreshAfterLogout = await fetch(`${authBase}/refresh`, {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      Cookie: secondCookie,
    },
  });
  assert.equal(refreshAfterLogout.status, 401);

  const invalidCookieRefresh = await fetch(`${authBase}/refresh`, {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      Cookie: `${REFRESH_COOKIE_NAME}=${'a'.repeat(128)}`,
    },
  });
  assert.equal(invalidCookieRefresh.status, 401);

  const missingTokenRefresh = await postJson(`${authBase}/refresh`, {});
  assert.equal(missingTokenRefresh.status, 401);

  const bodyLogin = await postJson(`${authBase}/login`, {
    identifier: email,
    password,
    adminOnly: true,
  });
  assert.equal(bodyLogin.status, 200);
  const bodyLoginPayload = (await bodyLogin.json()).data;

  const bodyRefresh = await postJson(`${authBase}/refresh`, {
    refreshToken: bodyLoginPayload.refreshToken,
    adminOnly: true,
  });
  assert.equal(bodyRefresh.status, 200, 'corpo continua aceite para compatibilidade');
  const bodyRefreshPayload = (await bodyRefresh.json()).data;

  const bodyLogout = await postJson(`${authBase}/logout`, {
    refreshToken: bodyRefreshPayload.refreshToken,
  });
  assert.equal(bodyLogout.status, 200);

  const untrustedOrigin = await postJson(
    `${authBase}/login`,
    { identifier: email, password, adminOnly: true },
    { Origin: 'https://evil.example' }
  );
  assert.equal(untrustedOrigin.status, 403);
});
