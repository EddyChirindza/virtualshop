// ─────────────────────────────────────────────
// VirtualShop API — Rotas de autenticação
// ─────────────────────────────────────────────
const { Router } = require('express');
const controller = require('./auth.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { loginLimiter, registerLimiter, refreshLimiter, logoutLimiter } = require('../../middlewares/rateLimiter');

const router = Router();

router.post('/register', registerLimiter, controller.register);
router.post('/login', loginLimiter, controller.login);
router.post('/refresh', refreshLimiter, controller.refresh);
router.post('/logout', logoutLimiter, controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
