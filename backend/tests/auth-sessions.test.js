const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { pool, query } = require('../src/config/db');
const env = require('../src/config/env');
const app = require('../src/app');
const authService = require('../src/modules/auth/auth.service');
const { generateAccessToken, hashRefreshToken } = require('../src/utils/tokens');
const { assertIsolatedTestDatabase } = require('../test-support/assert-test-database');
const usersService = require('../src/modules/users/users.service');

test('sessões controlam acesso, logout e rotação de refresh tokens', async (t) => {
  assertIsolatedTestDatabase();
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
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const unique = crypto.randomUUID().slice(0, 8);
  const phone = `+25887${Date.now().toString().slice(-8)}`;
  const password = 'Password123';

  const registered = await authService.register({
    full_name: 'Teste Sessões',
    phone,
    email: `sessions-${unique}@example.com`,
    password,
  }, {});
  const userId = registered.user.id;
  createdUserIds.push(userId);
  const registrationClaims = jwt.decode(registered.accessToken);
  assert.ok(registrationClaims.sid, 'registo deve emitir token com sessão');
  const registrationSession = await query(
    'SELECT id FROM user_sessions WHERE id = $1 AND user_id = $2',
    [registrationClaims.sid, userId]
  );
  assert.equal(registrationSession.rows.length, 1);

  const firstLogin = await authService.login({ identifier: phone, password }, {});
  const secondLogin = await authService.login({ identifier: phone, password }, {});
  const firstSid = jwt.decode(firstLogin.accessToken).sid;
  const secondSid = jwt.decode(secondLogin.accessToken).sid;
  assert.notEqual(firstSid, secondSid, 'cada login deve criar uma sessão independente');

  const me = (accessToken) => fetch(`${base}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  assert.equal((await me(firstLogin.accessToken)).status, 200);

  let response = await fetch(`${base}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: firstLogin.refreshToken }),
  });
  assert.equal(response.status, 200);
  assert.equal((await me(firstLogin.accessToken)).status, 401, 'logout invalida access token imediatamente');
  response = await fetch(`${base}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: firstLogin.refreshToken }),
  });
  assert.equal(response.status, 401, 'refresh token anterior ao logout é rejeitado');
  assert.equal((await me(secondLogin.accessToken)).status, 200, 'logout preserva sessões independentes');

  const rotated = await authService.refresh(secondLogin.refreshToken, {});
  assert.equal(jwt.decode(rotated.accessToken).sid, secondSid, 'rotação mantém o sid');
  await assert.rejects(
    authService.refresh(secondLogin.refreshToken, {}),
    (err) => err.statusCode === 401,
    'refresh token revogado não pode ser reutilizado'
  );
  const reusedSession = await query(
    'SELECT revoked_at FROM user_sessions WHERE id = $1',
    [secondSid]
  );
  assert.ok(reusedSession.rows[0].revoked_at, 'reutilização de refresh revoga toda a sessão');
  const rotatedHash = hashRefreshToken(rotated.refreshToken);
  await query('UPDATE refresh_tokens SET expires_at = now() - interval \'1 second\' WHERE token_hash = $1', [rotatedHash]);
  await assert.rejects(
    authService.refresh(rotated.refreshToken, {}),
    (err) => err.statusCode === 401,
    'refresh token expirado é rejeitado'
  );

  const other = await authService.register({
    full_name: 'Outro Utilizador',
    phone: `+25886${Date.now().toString().slice(-8)}`,
    email: `sessions-other-${unique}@example.com`,
    password,
  }, {});
  createdUserIds.push(other.user.id);
  const otherSid = jwt.decode(other.accessToken).sid;
  const forgedAssociation = generateAccessToken({ id: userId, role: 'customer' }, otherSid);
  assert.equal((await me(forgedAssociation)).status, 401, 'sid de outro utilizador é rejeitado');
  const legacyToken = jwt.sign({ sub: userId, role: 'customer' }, env.jwt.secret, { expiresIn: '5m' });
  assert.equal((await me(legacyToken)).status, 401, 'access token antigo sem sid é rejeitado');

  const expiredSid = crypto.randomUUID();
  await query(
    'INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, now() - interval \'1 second\')',
    [expiredSid, userId]
  );
  assert.equal((await me(generateAccessToken({ id: userId, role: 'customer' }, expiredSid))).status, 401);

  await query('UPDATE users SET is_active = false WHERE id = $1', [userId]);
  assert.equal((await me(secondLogin.accessToken)).status, 401, 'utilizador desativado não pode usar a sessão');
  await query('UPDATE users SET is_active = true WHERE id = $1', [userId]);

  const passwordSessionA = await authService.login({ identifier: phone, password }, {});
  const passwordSessionB = await authService.login({ identifier: phone, password }, {});
  await usersService.updatePassword(userId, {
    currentPassword: password,
    newPassword: 'NewPassword123',
  });
  assert.equal((await me(passwordSessionA.accessToken)).status, 401);
  assert.equal((await me(passwordSessionB.accessToken)).status, 401);
  await assert.rejects(authService.refresh(passwordSessionA.refreshToken, {}), (err) => err.statusCode === 401);
  await assert.rejects(authService.refresh(passwordSessionB.refreshToken, {}), (err) => err.statusCode === 401);
  await assert.rejects(
    authService.login({ identifier: phone, password }, {}),
    (err) => err.statusCode === 401,
    'password anterior deixa de autenticar'
  );

  const adminLogin = await authService.login({ identifier: phone, password: 'NewPassword123' }, {});
  await query("UPDATE users SET role = 'admin' WHERE id = $1", [userId]);
  const adminServerBase = base.replace('/api/auth', '/api/admin');
  response = await fetch(`${adminServerBase}/dashboard`, {
    headers: { Authorization: `Bearer ${adminLogin.accessToken}` },
  });
  assert.equal(response.status, 200, 'role atual do utilizador concede permissão sem relogin');
  await query("UPDATE users SET role = 'customer' WHERE id = $1", [userId]);
  response = await fetch(`${adminServerBase}/dashboard`, {
    headers: { Authorization: `Bearer ${adminLogin.accessToken}` },
  });
  assert.equal(response.status, 403, 'despromoção revoga permissão do token ainda válido');

  const concurrentLogin = await authService.login({ identifier: phone, password: 'NewPassword123' }, {});
  const concurrentRefreshes = await Promise.all([
    fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: concurrentLogin.refreshToken }),
    }),
    fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: concurrentLogin.refreshToken }),
    }),
  ]);
  assert.equal(
    concurrentRefreshes.filter((result) => result.status === 200).length,
    1,
    'duas requisições com o mesmo refresh não emitem dois pares'
  );
  const concurrentSessionId = jwt.decode(concurrentLogin.accessToken).sid;
  const concurrentSession = await query(
    'SELECT revoked_at FROM user_sessions WHERE id = $1',
    [concurrentSessionId]
  );
  assert.ok(concurrentSession.rows[0].revoked_at, 'replay concorrente revoga a sessão');

  // Confirma explicitamente que o logout repetido permanece seguro.
  response = await fetch(`${base}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: firstLogin.refreshToken }),
  });
  assert.equal(response.status, 200);
});
