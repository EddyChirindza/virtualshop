// ─────────────────────────────────────────────
// VirtualShop API — Logger
//
// Regra de ouro: NUNCA logar password, password_hash, tokens
// (access ou refresh) nem headers de Authorization.
// ─────────────────────────────────────────────
function info(message, meta = {}) {
  console.log(`[info] ${message}`, meta);
}

function warn(message, meta = {}) {
  console.warn(`[warn] ${message}`, meta);
}

function error(message, err) {
  console.error(`[error] ${message}`, err?.message || err);
}

module.exports = { info, warn, error };
