// ─────────────────────────────────────────────
// VirtualShop API — Pool de ligação PostgreSQL
//
// Usa sempre queries parametrizadas ($1, $2, ...)
// — NUNCA concatenar strings com input do utilizador.
// ─────────────────────────────────────────────
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] Erro inesperado no pool de ligações:', err.message);
});

// Helper simples para queries — mantém o padrão de queries parametrizadas
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
