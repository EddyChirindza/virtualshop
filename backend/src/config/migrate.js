// ─────────────────────────────────────────────
// VirtualShop API — Runner de migrations
//
// Uso:
//   npm run migrate
//   npm run migrate -- --only 018_create_user_sessions.sql
// ─────────────────────────────────────────────
const path = require('path');
const { pool } = require('./db');
const env = require('./env');
const {
  assertIsolatedTestDatabase,
  assertConnectedTestDatabase,
} = require('../../test-support/assert-test-database');
const { runMigrations } = require('./migration-runner');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

async function main(args = process.argv.slice(2)) {
  try {
    if (env.nodeEnv === 'test') {
      assertIsolatedTestDatabase();
      await assertConnectedTestDatabase(pool);
    }

    await runMigrations({ pool, migrationsDir: MIGRATIONS_DIR, args });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[migrate] erro fatal:', err);
    process.exitCode = 1;
  });
}

module.exports = { main };
