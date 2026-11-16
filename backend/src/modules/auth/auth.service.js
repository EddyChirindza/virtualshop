// ─────────────────────────────────────────────
// VirtualShop API — Serviço de autenticação
// ─────────────────────────────────────────────
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const { pool, query } = require('../../config/db');
const env = require('../../config/env');
const { ApiError } = require('../../middlewares/error.middleware');
const {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} = require('../../utils/tokens');

function toPublicUser(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    email: row.email,
    role: row.role,
  };
}

async function inTransaction(operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function register({ full_name, phone, email, password }, meta) {
  let stage = 'existing-user';
  const normalizedEmail = email?.trim().toLowerCase() || null;

  try {
    const existing = await query(
      'SELECT id FROM users WHERE ($1::text IS NOT NULL AND email = $1) OR phone = $2',
      [normalizedEmail, phone]
    );
    if (existing.rows.length > 0) {
      throw new ApiError(409, 'Já existe uma conta com este email ou telemóvel.');
    }

    stage = 'password-hash';
    const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

    stage = 'create-user-session';
    return await inTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO users (full_name, phone, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'customer')
         RETURNING id, full_name, phone, email, role`,
        [full_name, phone, normalizedEmail, passwordHash]
      );

      const user = rows[0];
      const tokens = await issueTokenPair(client, user, meta);
      return { user: toPublicUser(user), ...tokens };
    });
  } catch (err) {
    console.error(`[auth] Falha no registo na etapa ${stage}`, {
      name: err.name,
      code: err.code,
      message: err.message,
      issues: err.issues,
      stack: err.stack,
    });
    throw err;
  }
}

async function login({ identifier, password, adminOnly = false }, meta) {
  const { rows } = await query(
    `SELECT id, full_name, phone, email, password_hash, role, is_active
     FROM users WHERE email = $1 OR phone = $1`,
    [identifier]
  );

  const user = rows[0];
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Credenciais inválidas.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, 'Credenciais inválidas.');
  }
  if (adminOnly && user.role !== 'admin') {
    throw new ApiError(403, 'Acesso negado.');
  }

  return inTransaction(async (client) => {
    const currentUserResult = await client.query(
      `SELECT id, full_name, phone, email, password_hash, role, is_active
       FROM users WHERE id = $1 FOR UPDATE`,
      [user.id]
    );
    const currentUser = currentUserResult.rows[0];
    if (
      !currentUser ||
      !currentUser.is_active ||
      currentUser.password_hash !== user.password_hash
    ) {
      throw new ApiError(401, 'Credenciais inválidas.');
    }
    if (adminOnly && currentUser.role !== 'admin') {
      throw new ApiError(403, 'Acesso negado.');
    }

    await client.query('UPDATE users SET last_login_at = now() WHERE id = $1', [
      currentUser.id,
    ]);
    const tokens = await issueTokenPair(client, currentUser, meta);
    return { user: toPublicUser(currentUser), ...tokens };
  });
}

async function issueTokenPair(client, user, meta = {}, sessionId = null) {
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();
  const id = sessionId || crypto.randomUUID();

  if (sessionId) {
    const { rows } = await client.query(
      `UPDATE user_sessions SET expires_at = $2
       WHERE id = $1 AND user_id = $3 AND revoked_at IS NULL
       RETURNING id`,
      [id, expiresAt, user.id]
    );
    if (!rows[0]) {
      throw new ApiError(401, 'Sessão inválida. Autentica-te novamente.');
    }
  } else {
    await client.query(
      `INSERT INTO user_sessions (id, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [id, user.id, expiresAt]
    );
  }

  await client.query(
    `INSERT INTO refresh_tokens
       (user_id, session_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user.id, id, tokenHash, meta.userAgent || null, meta.ip || null, expiresAt]
  );

  const accessToken = generateAccessToken(user, id);
  return { accessToken, refreshToken };
}

async function revokeSession(client, sessionId) {
  await client.query(
    `UPDATE user_sessions
     SET revoked_at = COALESCE(revoked_at, now())
     WHERE id = $1`,
    [sessionId]
  );
  await client.query(
    `UPDATE refresh_tokens
     SET revoked_at = COALESCE(revoked_at, now())
     WHERE session_id = $1`,
    [sessionId]
  );
}

async function refresh(refreshToken, meta, { adminOnly = false } = {}) {
  const tokenHash = hashRefreshToken(refreshToken);
  const outcome = await inTransaction(async (client) => {
    const tokenResult = await client.query(
      `SELECT id, user_id, session_id
       FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    const tokenReference = tokenResult.rows[0];
    if (!tokenReference?.session_id) {
      throw new ApiError(401, 'Sessão inválida. Autentica-te novamente.');
    }

    const sessionResult = await client.query(
      `SELECT id, user_id, revoked_at, expires_at
       FROM user_sessions WHERE id = $1 FOR UPDATE`,
      [tokenReference.session_id]
    );
    const session = sessionResult.rows[0];
    if (!session || session.user_id !== tokenReference.user_id) {
      throw new ApiError(401, 'Sessão inválida. Autentica-te novamente.');
    }

    const currentResult = await client.query(
      `SELECT rt.id, rt.user_id, rt.session_id, rt.expires_at, rt.revoked_at,
              u.id AS u_id, u.full_name, u.phone, u.email, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.id = $1 AND rt.token_hash = $2
       FOR UPDATE OF rt`,
      [tokenReference.id, tokenHash]
    );
    const row = currentResult.rows[0];
    if (!row || row.session_id !== session.id || row.user_id !== session.user_id) {
      throw new ApiError(401, 'Sessão inválida. Autentica-te novamente.');
    }

    if (row.revoked_at) {
      await revokeSession(client, session.id);
      return { error: new ApiError(401, 'Sessão inválida. Autentica-te novamente.') };
    }
    if (
      session.revoked_at ||
      new Date(session.expires_at) <= new Date() ||
      new Date(row.expires_at) <= new Date() ||
      !row.is_active
    ) {
      await revokeSession(client, session.id);
      return { error: new ApiError(401, 'Sessão inválida. Autentica-te novamente.') };
    }
    if (adminOnly && row.role !== 'admin') {
      await revokeSession(client, session.id);
      return { error: new ApiError(403, 'Acesso negado.') };
    }

    const consumed = await client.query(
      `UPDATE refresh_tokens SET revoked_at = now()
       WHERE id = $1 AND session_id = $2
         AND revoked_at IS NULL AND expires_at > now()
       RETURNING id`,
      [row.id, session.id]
    );
    if (!consumed.rows[0]) {
      await revokeSession(client, session.id);
      return { error: new ApiError(401, 'Sessão inválida. Autentica-te novamente.') };
    }

    const user = {
      id: row.u_id,
      full_name: row.full_name,
      phone: row.phone,
      email: row.email,
      role: row.role,
    };
    const tokens = await issueTokenPair(client, user, meta, session.id);
    return { user: toPublicUser(user), ...tokens };
  });

  if (outcome.error) throw outcome.error;
  return outcome;
}

async function logout(refreshToken) {
  const tokenHash = hashRefreshToken(refreshToken);
  await inTransaction(async (client) => {
    const tokenResult = await client.query(
      `SELECT id, user_id, session_id
       FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    const tokenReference = tokenResult.rows[0];
    if (!tokenReference?.session_id) return;

    const sessionResult = await client.query(
      `SELECT id, user_id FROM user_sessions
       WHERE id = $1 FOR UPDATE`,
      [tokenReference.session_id]
    );
    const session = sessionResult.rows[0];
    if (!session || session.user_id !== tokenReference.user_id) return;

    const currentToken = await client.query(
      `SELECT id FROM refresh_tokens
       WHERE id = $1 AND session_id = $2 AND token_hash = $3
       FOR UPDATE`,
      [tokenReference.id, session.id, tokenHash]
    );
    if (currentToken.rows[0]) {
      await revokeSession(client, session.id);
    }
  });
}

async function getById(userId) {
  const { rows } = await query(
    'SELECT id, full_name, phone, email, role FROM users WHERE id = $1',
    [userId]
  );
  if (!rows[0]) {
    throw new ApiError(404, 'Utilizador não encontrado.');
  }
  return toPublicUser(rows[0]);
}

module.exports = { register, login, refresh, logout, getById };
