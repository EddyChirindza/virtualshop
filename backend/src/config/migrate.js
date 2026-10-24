// ─────────────────────────────────────────────
// VirtualShop API — Runner de migrations
//
// Aplica, por ordem, os ficheiros .sql em /migrations
// que ainda não constam na tabela schema_migrations.
// Uso: npm run migrate
// ─────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations() {
  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(rows.map((r) => r.filename));
}

async function run() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] já aplicada: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[migrate] aplicada com sucesso: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrate] falhou em ${file}:`, err.message);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log('[migrate] concluído.');
  await pool.end();
}

run().catch((err) => {
  console.error('[migrate] erro fatal:', err);
  process.exit(1);
});
