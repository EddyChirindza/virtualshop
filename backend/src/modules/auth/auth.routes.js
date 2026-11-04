// ─────────────────────────────────────────────
// VirtualShop API — Rotas de autenticação
// ─────────────────────────────────────────────
const { Router } = require('express');
const controller = require('./auth.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireTrustedOrigin } = require('../../middlewares/origin.middleware');
const { loginLimiter, registerLimiter, refreshLimiter, logoutLimiter } = require('../../middlewares/rateLimiter');

const router = Router();

router.post('/register', registerLimiter, requireTrustedOrigin, controller.register);
router.post('/login', loginLimiter, requireTrustedOrigin, controller.login);
router.post('/refresh', refreshLimiter, requireTrustedOrigin, controller.refresh);
router.post('/logout', logoutLimiter, requireTrustedOrigin, controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
