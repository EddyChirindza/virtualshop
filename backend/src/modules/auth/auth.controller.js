// ─────────────────────────────────────────────
// VirtualShop API — Controlador de autenticação
// ─────────────────────────────────────────────
const authService = require('./auth.service');
const { registerSchema, loginSchema, refreshSchema } = require('./auth.validators');
const logger = require('../../utils/logger');

function requestMeta(req) {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

async function register(req, res, next) {
  try {
    const input = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.register(input, requestMeta(req));
    res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso!',
      data: { user, token: accessToken, refreshToken },
    });
  } catch (err) {
      console.error('[auth] Falha no registo', {
      name: err.name,
      code: err.code,
      message: err.message,
      issues: err.errors,
        stack: err.stack,
    });
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const input = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.login(input, requestMeta(req));
    res.json({
      success: true,
      message: 'Login efectuado!',
      data: { user, token: accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken, requestMeta(req));
    res.json({
      success: true,
      message: 'Token renovado.',
      data: { user: result.user, token: result.accessToken, refreshToken: result.refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);
    res.json({ success: true, message: 'Sessão terminada.' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getById(req.user.id);
    res.json({ success: true, message: 'OK', data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, me };
