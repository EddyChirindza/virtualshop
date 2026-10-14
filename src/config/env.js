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

  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),

  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
};

module.exports = env;
