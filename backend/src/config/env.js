// ─────────────────────────────────────────────
// VirtualShop API — Configuração central de env
// Lê e valida as variáveis de ambiente uma única vez.
// ─────────────────────────────────────────────
require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente em falta: ${name}`);
  }
  return value;
}

const cookieSameSite = (process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase();
if (!['lax', 'strict', 'none'].includes(cookieSameSite)) {
  throw new Error(
    'AUTH_COOKIE_SAME_SITE deve ser "lax", "strict" ou "none".'
  );
}

const cookieSecure =
  process.env.AUTH_COOKIE_SECURE !== undefined
    ? process.env.AUTH_COOKIE_SECURE === 'true'
    : nodeEnv === 'production';

if (cookieSameSite === 'none' && !cookieSecure) {
  throw new Error(
    'AUTH_COOKIE_SAME_SITE=none exige AUTH_COOKIE_SECURE=true.'
  );
}

const cookiePath = process.env.AUTH_COOKIE_PATH || '/api/auth';
if (!cookiePath.startsWith('/')) {
  throw new Error('AUTH_COOKIE_PATH deve começar por "/".');
}

const env = {
  nodeEnv,
  host: process.env.HOST || (nodeEnv === 'development' ? '0.0.0.0' : '127.0.0.1'),
  port: parseInt(process.env.PORT || '3000', 10),

  db: {
    host: required('DB_HOST'),
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresDays: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '30', 10),
  },

  authCookie: {
    name: process.env.AUTH_REFRESH_COOKIE_NAME || 'virtualshop_refresh',
    path: cookiePath,
    domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    secure: cookieSecure,
    sameSite: cookieSameSite,
  },

  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),

  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
};

module.exports = env;

