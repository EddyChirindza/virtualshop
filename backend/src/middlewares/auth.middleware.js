// ─────────────────────────────────────────────
// VirtualShop API — Middleware de autenticação
//
// Exige um Bearer access token válido. Em caso de sucesso,
// anexa { id, role } a req.user.
// ─────────────────────────────────────────────
const { verifyAccessToken } = require('../utils/tokens');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token não fornecido.' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
  }
}

// Restringe o acesso a determinados roles (ex: requireRole('admin'))
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Acesso negado.' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
