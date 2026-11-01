// ─────────────────────────────────────────────
// VirtualShop API — Middleware de autenticação
//
// Exige um Bearer access token válido. Em caso de sucesso,
// anexa o estado atual da conta (id, role) a req.user.
// ─────────────────────────────────────────────
const { verifyAccessToken } = require('../utils/tokens');
const { query } = require('../config/db');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token não fornecido.' });
  }

  const token = header.slice('Bearer '.length);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
  }

  const userId = Number(payload.sub);
  if (
    !Number.isSafeInteger(userId) || userId <= 0 ||
    !Number.isSafeInteger(payload.sid) || payload.sid <= 0
  ) {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
  }

  try {
    const { rows } = await query(
      `SELECT rt.id, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.id = $1
         AND rt.user_id = $2
         AND rt.revoked_at IS NULL
         AND rt.expires_at > now()
         AND u.is_active = true`,
      [payload.sid, userId]
    );
    if (!rows[0]) {
      return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
    }
    req.user = { id: userId, role: rows[0].role };
    return next();
  } catch (err) {
    return next(err);
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
