// ─────────────────────────────────────────────
// VirtualShop API — Ponto de entrada
// ─────────────────────────────────────────────
const app = require('./src/app');
const env = require('./src/config/env');
const { pool } = require('./src/config/db');
const { assertConnectedTestDatabase } = require('./test-support/assert-test-database');

async function startServer({
  application = app,
  runtime = env,
  databasePool = pool,
  validateTestDatabase = assertConnectedTestDatabase,
} = {}) {
  if (runtime.nodeEnv === 'test') {
    await validateTestDatabase(databasePool);
  }

  return application.listen(runtime.port, runtime.host, () => {
    console.log(`[server] VirtualShop API a correr em http://${runtime.host}:${runtime.port}`);
  });
}

if (require.main === module) {
  startServer().catch(async (error) => {
    console.error('[server] arranque bloqueado:', error.message);
    try {
      await pool.end();
    } catch (closeError) {
      console.error('[server] erro ao fechar a ligação PostgreSQL:', closeError.message);
    }
    process.exitCode = 1;
  });
}

module.exports = { startServer };
