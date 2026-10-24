// ─────────────────────────────────────────────
// VirtualShop API — Rate limiting
//
// Protege rotas sensíveis (login, registo) contra
// brute-force e abuso.
// ─────────────────────────────────────────────
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Login: no máx. 10 tentativas por IP a cada 15 min
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'development',
  message: { success: false, message: 'Demasiadas tentativas. Tenta novamente mais tarde.' },
});

// Registo: no máx. 5 contas por IP a cada 15 min
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'development',
  message: { success: false, message: 'Demasiados registos a partir deste IP. Tenta mais tarde.' },
});

// Pesquisa: no máx. 120 pedidos por IP a cada 15 min
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'development',
  message: { success: false, message: 'Demasiadas pesquisas. Tenta novamente mais tarde.' },
});

module.exports = { loginLimiter, registerLimiter, searchLimiter };
