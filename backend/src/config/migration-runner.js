const fs = require('node:fs');
const path = require('node:path');

const MIGRATION_LOCK_KEY = [1448308815, 1];

class MigrationCommitError extends Error {
  constructor(cause) {
    super(
      'Falha durante COMMIT; o resultado da transacção pode ser ambíguo. Verifique schema_migrations antes de qualquer nova tentativa.',
      { cause }
    );
    this.name = 'MigrationCommitError';
  }
}

function parseMigrationSelection(args) {
  if (args.length === 0) return null;
  if (args.length !== 2 || args[0] !== '--only') {
    throw new Error(
      'Argumentos inválidos. Uso: npm run migrate [-- --only <nome-da-migracao.sql>]'
    );
  }

  const filename = args[1];
  if (
    typeof filename !== 'string' ||
    !filename ||
    path.isAbsolute(filename) ||
    filename === '.' ||
    filename === '..' ||
    filename.includes('/') ||
    filename.includes('\\') ||
    path.basename(filename) !== filename ||
    path.extname(filename) !== '.sql'
  ) {
    throw new Error(
      'Migração inválida. Indica apenas o nome de um ficheiro .sql do directório oficial de migrações.'
    );
  }

  return filename;
}

function discoverMigrations(migrationsDir) {
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();
}

async function withMigrationLock(pool, operation) {
  const client = await pool.connect();
  let transactionStarted = false;
  let destroyWithError;

  try {
    try {
      await client.query('BEGIN');
    } catch (error) {
      destroyWithError = error;
      throw error;
    }
    transactionStarted = true;
    try {
      await client.query(
        'SELECT pg_advisory_xact_lock($1, $2)',
        MIGRATION_LOCK_KEY
      );
    } catch (error) {
      destroyWithError = error;
      throw error;
    }

    const result = await operation(client);
    try {
      await client.query('COMMIT');
    } catch (error) {
      const commitError = new MigrationCommitError(error);
      destroyWithError = commitError;
      throw commitError;
    }
    transactionStarted = false;
    return result;
  } catch (error) {
    let thrownError = error;
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
        transactionStarted = false;
      } catch (rollbackError) {
        destroyWithError = rollbackError;
        thrownError = new AggregateError(
          [error, rollbackError],
          'A operação de migração falhou e o rollback também falhou; a ligação foi descartada.'
        );
      }
    }
    throw thrownError;
  } finally {
    client.release(destroyWithError);
  }
}

async function ensureMigrationsTable(pool) {
  await withMigrationLock(pool, (client) =>
    client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)
  );
}

async function applyMigration(pool, filename, sql, previousMigrations, logger) {
  const applied = await withMigrationLock(pool, async (client) => {
    const { rows } = await client.query(
      'SELECT filename FROM schema_migrations'
    );
    const appliedMigrations = new Set(rows.map((row) => row.filename));
    if (appliedMigrations.has(filename)) return false;

    const pendingPrevious = previousMigrations.filter(
      (previous) => !appliedMigrations.has(previous)
    );
    if (pendingPrevious.length > 0) {
      throw new Error(
        `Migração ${filename} não pode ser aplicada: migrações anteriores pendentes: ${pendingPrevious.join(', ')}`
      );
    }

    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
    return true;
  });

  if (applied) {
    logger.log(`[migrate] aplicada com sucesso: ${filename}`);
  } else {
    logger.log(`[migrate] já aplicada: ${filename}`);
  }
  return applied;
}

async function runMigrations({
  pool,
  migrationsDir,
  args = [],
  logger = console,
}) {
  const selectedMigration = parseMigrationSelection(args);
  const migrations = discoverMigrations(migrationsDir);

  if (selectedMigration && !migrations.includes(selectedMigration)) {
    throw new Error(
      `Migração não encontrada no directório oficial: ${selectedMigration}`
    );
  }

  await ensureMigrationsTable(pool);
  const selectedMigrations = selectedMigration
    ? [selectedMigration]
    : migrations;
  const results = [];

  for (const filename of selectedMigrations) {
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
    const migrationIndex = migrations.indexOf(filename);
    const previousMigrations = selectedMigration
      ? migrations.slice(0, migrationIndex)
      : [];
    try {
      results.push({
        filename,
        applied: await applyMigration(
          pool,
          filename,
          sql,
          previousMigrations,
          logger
        ),
      });
    } catch (error) {
      logger.error(`[migrate] falhou em ${filename}:`, error.message);
      throw error;
    }
  }

  logger.log('[migrate] concluído.');
  return results;
}

module.exports = {
  discoverMigrations,
  parseMigrationSelection,
  runMigrations,
};
