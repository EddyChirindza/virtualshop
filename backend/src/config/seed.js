// ─────────────────────────────────────────────
// VirtualShop API — Runner do seed
// Uso: npm run seed
// ─────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'seed.sql'), 'utf8');
  await pool.query(sql);
  console.log('[seed] dados de teste inseridos (ou já existentes).');
  await pool.end();
}

run().catch((err) => {
  console.error('[seed] erro:', err.message);
  process.exit(1);
});
