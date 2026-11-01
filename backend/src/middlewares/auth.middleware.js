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
    typeof payload.sid !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.sid)
  ) {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
  }

  try {
    const { rows } = await query(
      `SELECT us.id, u.role
       FROM user_sessions us
       JOIN users u ON u.id = us.user_id
       WHERE us.id = $1
         AND us.user_id = $2
         AND us.revoked_at IS NULL
         AND us.expires_at > now()
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
