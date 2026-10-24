// ─────────────────────────────────────────────
// VirtualShop API — Serviço de autenticação
// ─────────────────────────────────────────────
const bcrypt = require('bcrypt');
const { query } = require('../../config/db');
const env = require('../../config/env');
const { ApiError } = require('../../middlewares/error.middleware');
const logger = require('../../utils/logger');
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

    stage = 'insert-user';
    const { rows } = await query(
      `INSERT INTO users (full_name, phone, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING id, full_name, phone, email, role`,
      [full_name, phone, normalizedEmail, passwordHash]
    );

    const user = rows[0];
    stage = 'issue-tokens';
    const tokens = await issueTokenPair(user, meta);
    return { user: toPublicUser(user), ...tokens };
  } catch (err) {
      console.error(`[auth] Falha no registo na etapa ${stage}`, {
      name: err.name,
      code: err.code,
      message: err.message,
        stack: err.stack,
    });
    throw err;
  }
}

async function login({ identifier, password }, meta) {
  const { rows } = await query(
    `SELECT id, full_name, phone, email, password_hash, role, is_active
     FROM users WHERE email = $1 OR phone = $1`,
    [identifier]
  );

  const user = rows[0];
  // Mensagem genérica de propósito — não revelar se foi o identificador ou a password
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Credenciais inválidas.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, 'Credenciais inválidas.');
  }

  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  const tokens = await issueTokenPair(user, meta);
  return { user: toPublicUser(user), ...tokens };
}

async function issueTokenPair(user, meta = {}) {
  const accessToken = generateAccessToken(user);
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, tokenHash, meta.userAgent || null, meta.ip || null, expiresAt]
  );

  return { accessToken, refreshToken };
}

async function refresh(refreshToken, meta) {
  const tokenHash = hashRefreshToken(refreshToken);

  const { rows } = await query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at,
            u.id AS u_id, u.full_name, u.phone, u.email, u.role, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [tokenHash]
  );

  const row = rows[0];
  if (!row || row.revoked_at || new Date(row.expires_at) < new Date() || !row.is_active) {
    throw new ApiError(401, 'Sessão inválida. Autentica-te novamente.');
  }

  // Rotação: revoga o token usado e emite um par novo
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [row.id]);

  const user = { id: row.u_id, full_name: row.full_name, phone: row.phone, email: row.email, role: row.role };
  const tokens = await issueTokenPair(user, meta);
  return { user: toPublicUser(user), ...tokens };
}

async function logout(refreshToken) {
  const tokenHash = hashRefreshToken(refreshToken);
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [tokenHash]);
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
