// ─────────────────────────────────────────────
// VirtualShop API — Tokens de autenticação
//
// Access token: JWT de curta duração, assinado, com o payload mínimo.
// Refresh token: valor aleatório opaco (não é JWT) — só o HASH fica
// guardado na BD, para que possamos revogar/rodar sem expor o segredo
// em caso de fuga de dados na base.
// ─────────────────────────────────────────────
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

function generateRefreshToken() {
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.jwt.refreshExpiresDays);
  return { token, tokenHash, expiresAt };
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
