// ─────────────────────────────────────────────
// VirtualShop API — Validação de origem
//
// Defesa adicional contra CSRF em endpoints que podem
// autenticar através de cookie. Clientes nativos não enviam
// Origin e continuam a usar o refresh token no corpo.
// ─────────────────────────────────────────────
const env = require('../config/env');
const { ApiError } = require('./error.middleware');

function isLocalhostOrigin(origin) {
  const match = origin.match(/^https?:\/\/(localhost|127\.0\.0\.1):(\d{1,5})$/);
  return Boolean(match && Number(match[2]) <= 65535);
}

function isAllowedOrigin(origin) {
  if (env.corsOrigins.includes(origin)) return true;
  return env.nodeEnv === 'development' && isLocalhostOrigin(origin);
}

function requireTrustedOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (!origin || isAllowedOrigin(origin)) return next();
  return next(new ApiError(403, 'Origem não permitida.'));
}

module.exports = { requireTrustedOrigin };
