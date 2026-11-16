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
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
  }

  const sessionId =
    typeof payload.sid === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.sid)
      ? payload.sid
      : null;
  const legacyTokenId =
    Number.isSafeInteger(payload.sid) && payload.sid > 0 ? payload.sid : null;
  if (!sessionId && !legacyTokenId) {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
  }

  try {
    const { rows } = await query(
      `SELECT u.role
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > now()
         AND u.is_active = true
         AND (
           s.id = $2::uuid
           OR EXISTS (
             SELECT 1
             FROM refresh_tokens rt
             WHERE rt.id = $3
               AND rt.user_id = s.user_id
               AND rt.session_id = s.id
           )
         )`,
      [userId, sessionId, legacyTokenId]
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
