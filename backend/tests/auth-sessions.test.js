const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { pool, query } = require('../src/config/db');
const env = require('../src/config/env');
const app = require('../src/app');
const authService = require('../src/modules/auth/auth.service');
const { generateAccessToken, hashRefreshToken } = require('../src/utils/tokens');
const { assertConnectedTestDatabase } = require('../test-support/assert-test-database');
const usersService = require('../src/modules/users/users.service');

async function postJson(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
    },
    body: JSON.stringify(body),
  });
}

test('sessões isolam utilizadores, rodam refresh e revogam corridas', async (t) => {
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

  const base = `http://127.0.0.1:${server.address().port}/api`;
  const authBase = `${base}/auth`;
  const unique = crypto.randomUUID().slice(0, 8);
  const phone = `+25887${Date.now().toString().slice(-8)}`;
  const password = 'Password123';
  const me = (accessToken) => fetch(`${authBase}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Origin: 'http://localhost:5173',
    },
  });

  const { rows: migrationRows } = await query(
    `SELECT column_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'refresh_tokens'
       AND column_name = 'session_id'`
  );
  assert.equal(migrationRows[0]?.is_nullable, 'NO');
  const { rows: sessionForeignKey } = await query(
    `SELECT 1 FROM pg_constraint
     WHERE conname = 'refresh_tokens_session_user_fkey'
       AND contype = 'f'`
  );
  assert.equal(sessionForeignKey.length, 1);
  const { rows: activeTokenIndex } = await query(
    `SELECT indexdef FROM pg_indexes
     WHERE schemaname = current_schema()
       AND indexname = 'idx_refresh_tokens_one_active_per_session'`
  );
  assert.match(activeTokenIndex[0]?.indexdef ?? '', /WHERE \(revoked_at IS NULL\)/);

  const registered = await authService.register({
    full_name: 'Teste Sessões',
    phone,
    email: `sessions-${unique}@example.com`,
    password,
  }, {});
  const userId = registered.user.id;
  createdUserIds.push(userId);
  const registrationClaims = jwt.decode(registered.accessToken);
  assert.match(registrationClaims.sid, /^[0-9a-f-]{36}$/i);
  const registrationSession = await query(
    `SELECT s.id, s.user_id, rt.session_id, rt.user_id AS token_user_id
     FROM user_sessions s
     JOIN refresh_tokens rt ON rt.session_id = s.id
     WHERE s.id = $1 AND rt.token_hash = $2`,
    [registrationClaims.sid, hashRefreshToken(registered.refreshToken)]
  );
  assert.equal(registrationSession.rows.length, 1);
  assert.equal(registrationSession.rows[0].user_id, userId);
  assert.equal(registrationSession.rows[0].token_user_id, userId);
  assert.equal((await me(registered.accessToken)).status, 200);

  const sessionsBeforeRejectedAdminLogin = await query(
    'SELECT count(*)::int AS count FROM user_sessions WHERE user_id = $1',
    [userId]
  );
  const rejectedAdminLogin = await postJson(`${authBase}/login`, {
    identifier: phone,
    password,
    adminOnly: true,
  });
  assert.equal(rejectedAdminLogin.status, 403);
  assert.equal(
    (await rejectedAdminLogin.json()).message,
    'Acesso negado.'
  );
  const sessionsAfterRejectedAdminLogin = await query(
    'SELECT count(*)::int AS count FROM user_sessions WHERE user_id = $1',
    [userId]
  );
  assert.equal(
    sessionsAfterRejectedAdminLogin.rows[0].count,
    sessionsBeforeRejectedAdminLogin.rows[0].count,
    'login admin rejeitado não deve criar sessão nem tokens'
  );

  const genericCustomerLogin = await postJson(`${authBase}/login`, {
    identifier: phone,
    password,
  });
  assert.equal(genericCustomerLogin.status, 200);
  const genericCustomerPayload = (await genericCustomerLogin.json()).data;
  assert.equal(genericCustomerPayload.user.role, 'customer');
  assert.ok(genericCustomerPayload.token);
  assert.ok(genericCustomerPayload.refreshToken);
  await authService.logout(genericCustomerPayload.refreshToken);

  const firstLogin = await authService.login({ identifier: phone, password }, {});
  const secondLogin = await authService.login({ identifier: phone, password }, {});
  const firstSid = jwt.decode(firstLogin.accessToken).sid;
  const secondSid = jwt.decode(secondLogin.accessToken).sid;
  assert.notEqual(firstSid, secondSid, 'cada login cria uma sessão independente');
  assert.equal((await me(firstLogin.accessToken)).status, 200);
  assert.equal((await me(secondLogin.accessToken)).status, 200);

  const secondTokenRow = await query(
    'SELECT id FROM refresh_tokens WHERE token_hash = $1',
    [hashRefreshToken(secondLogin.refreshToken)]
  );
  const legacyAccessToken = generateAccessToken(
    secondLogin.user,
    secondTokenRow.rows[0].id
  );
  assert.equal(
    (await me(legacyAccessToken)).status,
    200,
    'sid numérico legado continua associado à sessão migrada'
  );

  const rotatedResponse = await postJson(`${authBase}/refresh`, {
    refreshToken: firstLogin.refreshToken,
  });
  assert.equal(rotatedResponse.status, 200);
  const rotatedEnvelope = await rotatedResponse.json();
  assert.deepEqual(Object.keys(rotatedEnvelope.data).sort(), [
    'refreshToken',
    'token',
    'user',
  ]);
  const rotated = rotatedEnvelope.data;
  assert.equal(jwt.decode(rotated.token).sid, firstSid, 'rotação mantém o sid');
  assert.notEqual(rotated.refreshToken, firstLogin.refreshToken);
  assert.equal((await me(rotated.token)).status, 200);

  const refreshReuse = await postJson(`${authBase}/refresh`, {
    refreshToken: firstLogin.refreshToken,
  });
  assert.equal(refreshReuse.status, 401, 'refresh anterior só pode ser consumido uma vez');
  assert.equal((await me(rotated.token)).status, 401, 'replay revoga a sessão');
  const reusedSession = await query(
    'SELECT revoked_at FROM user_sessions WHERE id = $1',
    [firstSid]
  );
  assert.ok(reusedSession.rows[0].revoked_at);

  const logoutSession = await authService.login({ identifier: phone, password }, {});
  const logoutSessionId = jwt.decode(logoutSession.accessToken).sid;
  const logoutRotation = await authService.refresh(logoutSession.refreshToken, {});
  await authService.logout(logoutSession.refreshToken);
  assert.equal((await me(logoutRotation.accessToken)).status, 401);
  await assert.rejects(
    authService.refresh(logoutRotation.refreshToken, {}),
    (err) => err.statusCode === 401,
    'logout com o token anterior revoga o token emitido pela rotação'
  );
  const logoutRevocation = await query(
    `SELECT s.revoked_at, count(*) FILTER (WHERE rt.revoked_at IS NULL)::int AS active_tokens
     FROM user_sessions s
     JOIN refresh_tokens rt ON rt.session_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [logoutSessionId]
  );
  assert.ok(logoutRevocation.rows[0].revoked_at);
  assert.equal(logoutRevocation.rows[0].active_tokens, 0);

  const concurrentLogin = await authService.login({ identifier: phone, password }, {});
  const concurrentSessionId = jwt.decode(concurrentLogin.accessToken).sid;
  const [concurrentRefresh, concurrentLogout] = await Promise.all([
    postJson(`${authBase}/refresh`, { refreshToken: concurrentLogin.refreshToken }),
    postJson(`${authBase}/logout`, { refreshToken: concurrentLogin.refreshToken }),
  ]);
  assert.ok([200, 401].includes(concurrentRefresh.status));
  assert.equal(concurrentLogout.status, 200);
  if (concurrentRefresh.status === 200) {
    const body = await concurrentRefresh.json();
    assert.equal((await me(body.data.token)).status, 401);
    assert.equal(
      (await postJson(`${authBase}/refresh`, {
        refreshToken: body.data.refreshToken,
      })).status,
      401
    );
  }
  const concurrentSession = await query(
    `SELECT s.revoked_at, count(*) FILTER (WHERE rt.revoked_at IS NULL)::int AS active_tokens
     FROM user_sessions s
     JOIN refresh_tokens rt ON rt.session_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [concurrentSessionId]
  );
  assert.ok(concurrentSession.rows[0].revoked_at);
  assert.equal(concurrentSession.rows[0].active_tokens, 0);

  const sameTokenRace = await authService.login({ identifier: phone, password }, {});
  const sameTokenSessionId = jwt.decode(sameTokenRace.accessToken).sid;
  const raceResponses = await Promise.all([
    postJson(`${authBase}/refresh`, { refreshToken: sameTokenRace.refreshToken }),
    postJson(`${authBase}/refresh`, { refreshToken: sameTokenRace.refreshToken }),
  ]);
  assert.deepEqual(
    raceResponses.map((response) => response.status).sort(),
    [200, 401],
    'apenas um pedido consome o refresh token'
  );
  const raceSession = await query(
    `SELECT s.revoked_at, count(*) FILTER (WHERE rt.revoked_at IS NULL)::int AS active_tokens
     FROM user_sessions s
     JOIN refresh_tokens rt ON rt.session_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [sameTokenSessionId]
  );
  assert.ok(raceSession.rows[0].revoked_at, 'replay revoga a sessão toda');
  assert.equal(raceSession.rows[0].active_tokens, 0);

  const isolatedLogin = await authService.login({ identifier: phone, password }, {});
  const otherSessionLogin = await authService.login({ identifier: phone, password }, {});
  await authService.logout(isolatedLogin.refreshToken);
  assert.equal((await me(isolatedLogin.accessToken)).status, 401);
  assert.equal(
    (await me(otherSessionLogin.accessToken)).status,
    200,
    'logout não revoga sessões independentes do mesmo utilizador'
  );

  const other = await authService.register({
    full_name: 'Outro Utilizador',
    phone: `+25886${Date.now().toString().slice(-8)}`,
    email: `sessions-other-${unique}@example.com`,
    password,
  }, {});
  createdUserIds.push(other.user.id);
  const otherSid = jwt.decode(other.accessToken).sid;
  const forgedAssociation = generateAccessToken(
    { id: userId, role: 'customer' },
    otherSid
  );
  assert.equal((await me(forgedAssociation)).status, 401, 'sid de outro utilizador é rejeitado');

  const expiredSid = crypto.randomUUID();
  await query(
    `INSERT INTO user_sessions (id, user_id, expires_at)
     VALUES ($1, $2, now() - interval '1 second')`,
    [expiredSid, userId]
  );
  assert.equal(
    (await me(generateAccessToken({ id: userId, role: 'customer' }, expiredSid))).status,
    401,
    'access token associado a sessão expirada é rejeitado'
  );

  const adminRole = await query(
    "UPDATE users SET role = 'admin' WHERE id = $1 RETURNING id",
    [userId]
  );
  assert.equal(adminRole.rows.length, 1);
  const adminLoginResponse = await postJson(`${authBase}/login`, {
    identifier: phone,
    password,
    adminOnly: true,
  });
  assert.equal(adminLoginResponse.status, 200);
  const adminLoginEnvelope = await adminLoginResponse.json();
  assert.equal(adminLoginEnvelope.data.user.role, 'admin');
  const adminSessionId = jwt.decode(adminLoginEnvelope.data.token).sid;
  const adminDashboardUrl = `${base}/admin/dashboard`;
  const adminDashboard = () => fetch(adminDashboardUrl, {
    headers: {
      Authorization: `Bearer ${adminLoginEnvelope.data.token}`,
      Origin: 'http://localhost:5173',
    },
  });
  assert.equal((await adminDashboard()).status, 200);
  await query("UPDATE users SET role = 'customer' WHERE id = $1", [userId]);
  assert.equal((await adminDashboard()).status, 403);
  const demotedRefresh = await postJson(`${authBase}/refresh`, {
    refreshToken: adminLoginEnvelope.data.refreshToken,
    adminOnly: true,
  });
  assert.equal(demotedRefresh.status, 403);
  const demotedSession = await query(
    'SELECT revoked_at FROM user_sessions WHERE id = $1',
    [adminSessionId]
  );
  assert.ok(demotedSession.rows[0].revoked_at);

  const inactiveLogin = await authService.login({ identifier: phone, password }, {});
  const inactiveSessionId = jwt.decode(inactiveLogin.accessToken).sid;
  await query('UPDATE users SET is_active = false WHERE id = $1', [userId]);
  assert.equal((await me(inactiveLogin.accessToken)).status, 401);
  await assert.rejects(
    authService.refresh(inactiveLogin.refreshToken, {}),
    (err) => err.statusCode === 401
  );
  await query('UPDATE users SET is_active = true WHERE id = $1', [userId]);
  const inactiveSession = await query(
    'SELECT revoked_at FROM user_sessions WHERE id = $1',
    [inactiveSessionId]
  );
  assert.ok(inactiveSession.rows[0].revoked_at);

  const passwordSessionA = await authService.login({ identifier: phone, password }, {});
  const passwordSessionB = await authService.login({ identifier: phone, password }, {});
  await usersService.updatePassword(userId, {
    currentPassword: password,
    newPassword: 'NewPassword123',
  });
  assert.equal((await me(passwordSessionA.accessToken)).status, 401);
  assert.equal((await me(passwordSessionB.accessToken)).status, 401);
  await assert.rejects(
    authService.refresh(passwordSessionA.refreshToken, {}),
    (err) => err.statusCode === 401
  );
  await assert.rejects(
    authService.refresh(passwordSessionB.refreshToken, {}),
    (err) => err.statusCode === 401
  );
  await assert.rejects(
    authService.login({ identifier: phone, password }, {}),
    (err) => err.statusCode === 401
  );
  const nonAdminAfterPasswordChange = await query(
    'SELECT role FROM users WHERE id = $1',
    [userId]
  );
  assert.equal(nonAdminAfterPasswordChange.rows[0].role, 'customer');
  await assert.rejects(
    authService.login(
      { identifier: phone, password: 'NewPassword123', adminOnly: true },
      {}
    ),
    (err) => err.statusCode === 403,
    'conta não-admin não emite tokens para o painel'
  );
});
