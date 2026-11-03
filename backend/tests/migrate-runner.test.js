const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  parseMigrationSelection,
  runMigrations,
} = require('../src/config/migration-runner');

class AsyncMutex {
  constructor() {
    this.locked = false;
    this.waiters = [];
  }

  acquire() {
    return new Promise((resolve) => {
      const grant = () => {
        this.locked = true;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.locked = false;
          this.waiters.shift()?.();
        });
      };

      if (this.locked) this.waiters.push(grant);
      else grant();
    });
  }
}

class FakePool {
  constructor(applied = [], failures = {}) {
    this.applied = new Set(applied);
    this.executedMigrations = [];
    this.connections = [];
    this.lock = new AsyncMutex();
    this.failures = failures;
    this.events = [];
  }

  async connect() {
    const connection = new FakeClient(this, this.connections.length);
    this.connections.push(connection);
    return connection;
  }
}

class FakeClient {
  constructor(pool, id) {
    this.pool = pool;
    this.id = id;
    this.pendingMigration = null;
    this.releaseLock = null;
    this.released = false;
    this.destroyed = false;
    this.releaseError = null;
    this.rollbackCount = 0;
    this.transactionStarted = false;
  }

  async query(sql, params = []) {
    if (sql === 'BEGIN') {
      this.pool.events.push({ client: this.id, query: 'BEGIN' });
      if (this.pool.failures.BEGIN) throw this.pool.failures.BEGIN;
      this.transactionStarted = true;
      return {};
    }
    if (sql.includes('pg_advisory_xact_lock')) {
      this.pool.events.push({ client: this.id, query: 'LOCK_REQUEST' });
      this.releaseLock = await this.pool.lock.acquire();
      this.pool.events.push({ client: this.id, query: 'LOCK_ACQUIRED' });
      if (this.pool.failures.LOCK) throw this.pool.failures.LOCK;
      return { rows: [] };
    }
    if (sql.includes('CREATE TABLE IF NOT EXISTS schema_migrations')) {
      this.pool.events.push({ client: this.id, query: 'CREATE_TABLE' });
      return {};
    }
    if (sql.includes('SELECT filename FROM schema_migrations')) {
      this.pool.events.push({ client: this.id, query: 'READ_APPLIED' });
      return {
        rows: [...this.pool.applied, this.pendingMigration]
          .filter(Boolean)
          .map((filename) => ({ filename })),
      };
    }
    if (sql.startsWith('-- migration:')) {
      const filename = sql.split(/\r?\n/, 1)[0].slice('-- migration:'.length).trim();
      this.pool.events.push({ client: this.id, query: `MIGRATION:${filename}` });
      this.pool.executedMigrations.push(filename);
      if (sql.includes('-- fail') || this.pool.failures.MIGRATION) {
        throw this.pool.failures.MIGRATION || new Error('simulated migration failure');
      }
      return {};
    }
    if (sql.includes('INSERT INTO schema_migrations')) {
      this.pool.events.push({ client: this.id, query: 'INSERT_APPLIED' });
      if (this.pool.failures.INSERT) throw this.pool.failures.INSERT;
      this.pendingMigration = params[0];
      return {};
    }
    if (sql === 'COMMIT') {
      this.pool.events.push({ client: this.id, query: 'COMMIT' });
      if (
        this.pool.failures.COMMIT &&
        (!this.pool.failures.commitOnlyForMigration || this.pendingMigration)
      ) {
        if (this.pool.failures.commitApplied) {
          if (this.pendingMigration) this.pool.applied.add(this.pendingMigration);
          this.pendingMigration = null;
          this.transactionStarted = false;
          this.releaseTransactionLock();
        }
        throw this.pool.failures.COMMIT;
      }
      if (this.pendingMigration) this.pool.applied.add(this.pendingMigration);
      this.pendingMigration = null;
      this.transactionStarted = false;
      this.releaseTransactionLock();
      return {};
    }
    if (sql === 'ROLLBACK') {
      this.pool.events.push({ client: this.id, query: 'ROLLBACK' });
      if (this.pool.failures.ROLLBACK) throw this.pool.failures.ROLLBACK;
      this.rollbackCount += 1;
      this.pendingMigration = null;
      this.transactionStarted = false;
      this.releaseTransactionLock();
      return {};
    }
    throw new Error(`Unexpected query in fake pool: ${sql}`);
  }

  releaseTransactionLock() {
    this.releaseLock?.();
    this.releaseLock = null;
  }

  release(error) {
    this.released = true;
    this.releaseError = error;
    this.destroyed = Boolean(error);
    if (this.destroyed) {
      this.transactionStarted = false;
      this.pendingMigration = null;
      this.releaseTransactionLock();
    }
  }
}

async function createMigrations(files) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'virtualshop-migrations-'));
  for (const [filename, sql] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, filename), sql);
  }
  return directory;
}

function createLogger() {
  return { log() {}, error() {} };
}

test('normal mode applies all pending migrations in filename order', async (t) => {
  const migrationsDir = await createMigrations({
    '019_second.sql': '-- migration:019_second.sql',
    '018_first.sql': '-- migration:018_first.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool();

  const result = await runMigrations({
    pool,
    migrationsDir,
    logger: createLogger(),
  });

  assert.deepEqual(pool.executedMigrations, ['018_first.sql', '019_second.sql']);
  assert.deepEqual(result, [
    { filename: '018_first.sql', applied: true },
    { filename: '019_second.sql', applied: true },
  ]);
});

test('--only runs exactly the selected migration and leaves others pending', async (t) => {
  const migrationsDir = await createMigrations({
    '018_create_user_sessions.sql': '-- migration:018_create_user_sessions.sql',
    '019_link_refresh_tokens_to_sessions.sql':
      '-- migration:019_link_refresh_tokens_to_sessions.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool();

  const result = await runMigrations({
    pool,
    migrationsDir,
    args: ['--only', '018_create_user_sessions.sql'],
    logger: createLogger(),
  });

  assert.deepEqual(pool.executedMigrations, ['018_create_user_sessions.sql']);
  assert.deepEqual(result, [
    { filename: '018_create_user_sessions.sql', applied: true },
  ]);
  assert.ok(pool.applied.has('018_create_user_sessions.sql'));
  assert.ok(!pool.applied.has('019_link_refresh_tokens_to_sessions.sql'));
});

test('--only refuses a migration when any earlier migration is pending', async (t) => {
  const migrationsDir = await createMigrations({
    '018_create_user_sessions.sql': '-- migration:018_create_user_sessions.sql',
    '019_link_refresh_tokens_to_sessions.sql':
      '-- migration:019_link_refresh_tokens_to_sessions.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool();

  await assert.rejects(
    runMigrations({
      pool,
      migrationsDir,
      args: ['--only', '019_link_refresh_tokens_to_sessions.sql'],
      logger: createLogger(),
    }),
    /migrações anteriores pendentes: 018_create_user_sessions\.sql/
  );

  assert.deepEqual(pool.executedMigrations, []);
  assert.ok(!pool.applied.has('019_link_refresh_tokens_to_sessions.sql'));
});

test('--only permits a migration when all earlier migrations are applied', async (t) => {
  const migrationsDir = await createMigrations({
    '017_previous.sql': '-- migration:017_previous.sql',
    '018_create_user_sessions.sql': '-- migration:018_create_user_sessions.sql',
    '019_link_refresh_tokens_to_sessions.sql':
      '-- migration:019_link_refresh_tokens_to_sessions.sql',
    '020_later.sql': '-- migration:020_later.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool([
    '017_previous.sql',
    '018_create_user_sessions.sql',
  ]);

  await runMigrations({
    pool,
    migrationsDir,
    args: ['--only', '019_link_refresh_tokens_to_sessions.sql'],
    logger: createLogger(),
  });

  assert.deepEqual(pool.executedMigrations, [
    '019_link_refresh_tokens_to_sessions.sql',
  ]);
  assert.ok(!pool.applied.has('020_later.sql'));
});

test('predecessor validation happens after acquiring the advisory lock', async (t) => {
  const migrationsDir = await createMigrations({
    '018_previous.sql': '-- migration:018_previous.sql',
    '019_selected.sql': '-- migration:019_selected.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool(['018_previous.sql']);

  await runMigrations({
    pool,
    migrationsDir,
    args: ['--only', '019_selected.sql'],
    logger: createLogger(),
  });

  const selectedClient = pool.connections.at(-1).id;
  const events = pool.events
    .filter((event) => event.client === selectedClient)
    .map((event) => event.query);
  assert.ok(events.indexOf('LOCK_ACQUIRED') < events.indexOf('READ_APPLIED'));
  assert.ok(events.indexOf('READ_APPLIED') < events.indexOf('MIGRATION:019_selected.sql'));
});

test('an already-applied selected migration is reported without execution', async (t) => {
  const migrationsDir = await createMigrations({
    '018_create_user_sessions.sql': '-- migration:018_create_user_sessions.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool(['018_create_user_sessions.sql']);
  const messages = [];

  const result = await runMigrations({
    pool,
    migrationsDir,
    args: ['--only', '018_create_user_sessions.sql'],
    logger: { log: (message) => messages.push(message), error() {} },
  });

  assert.deepEqual(pool.executedMigrations, []);
  assert.deepEqual(result, [
    { filename: '018_create_user_sessions.sql', applied: false },
  ]);
  assert.ok(messages.some((message) => message.includes('já aplicada')));
});

test('an unknown migration is rejected before connecting to PostgreSQL', async (t) => {
  const migrationsDir = await createMigrations({
    '018_create_user_sessions.sql': '-- migration:018_create_user_sessions.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool();

  await assert.rejects(
    runMigrations({
      pool,
      migrationsDir,
      args: ['--only', '020_unknown.sql'],
      logger: createLogger(),
    }),
    /não encontrada no directório oficial/
  );
  assert.equal(pool.connections.length, 0);
});

test('invalid options and path traversal are rejected', () => {
  for (const args of [
    ['--only'],
    ['--only', '../018_create_user_sessions.sql'],
    ['--only', '/tmp/018_create_user_sessions.sql'],
    ['--only', 'folder\\018_create_user_sessions.sql'],
    ['--only', '018_create_user_sessions.js'],
    ['--only', '018_create_user_sessions.sql', '019_other.sql'],
    ['--all'],
  ]) {
    assert.throws(() => parseMigrationSelection(args));
  }

  assert.equal(
    parseMigrationSelection(['--only', '018_create_user_sessions.sql']),
    '018_create_user_sessions.sql'
  );
  assert.equal(parseMigrationSelection([]), null);
});

test('a migration error rolls back and releases its PostgreSQL connection', async (t) => {
  const migrationsDir = await createMigrations({
    '018_failure.sql': '-- migration:018_failure.sql\n-- fail',
    '019_not_reached.sql': '-- migration:019_not_reached.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool();

  await assert.rejects(
    runMigrations({ pool, migrationsDir, logger: createLogger() }),
    /simulated migration failure/
  );

  const migrationConnection = pool.connections.at(-1);
  assert.equal(migrationConnection.rollbackCount, 1);
  assert.equal(migrationConnection.released, true);
  assert.equal(migrationConnection.destroyed, false);
  assert.deepEqual(pool.executedMigrations, ['018_failure.sql']);
  assert.ok(!pool.applied.has('018_failure.sql'));
});

test('a schema_migrations insert error rolls back and does not advance', async (t) => {
  const migrationsDir = await createMigrations({
    '018_first.sql': '-- migration:018_first.sql',
    '019_not_reached.sql': '-- migration:019_not_reached.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool([], { INSERT: new Error('insert failed') });

  await assert.rejects(
    runMigrations({ pool, migrationsDir, logger: createLogger() }),
    /insert failed/
  );

  const connection = pool.connections.at(-1);
  assert.equal(connection.rollbackCount, 1);
  assert.equal(connection.released, true);
  assert.equal(connection.destroyed, false);
  assert.deepEqual(pool.executedMigrations, ['018_first.sql']);
  assert.ok(!pool.applied.has('018_first.sql'));
  assert.ok(!pool.executedMigrations.includes('019_not_reached.sql'));
});

test('connections are released after successful table setup and migration', async (t) => {
  const migrationsDir = await createMigrations({
    '018_success.sql': '-- migration:018_success.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool();

  await runMigrations({ pool, migrationsDir, logger: createLogger() });

  assert.equal(pool.connections.length, 2);
  assert.ok(pool.connections.every((connection) => connection.released));
});

test('a BEGIN error destroys the connection without attempting rollback', async (t) => {
  const migrationsDir = await createMigrations({
    '018_first.sql': '-- migration:018_first.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool([], { BEGIN: new Error('begin failed') });

  await assert.rejects(
    runMigrations({ pool, migrationsDir, logger: createLogger() }),
    /begin failed/
  );

  const connection = pool.connections.at(-1);
  assert.equal(connection.rollbackCount, 0);
  assert.equal(connection.released, true);
  assert.equal(connection.destroyed, true);
});

test('an advisory-lock error rolls back and destroys the connection', async (t) => {
  const migrationsDir = await createMigrations({
    '018_first.sql': '-- migration:018_first.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool([], { LOCK: new Error('lock failed') });

  await assert.rejects(
    runMigrations({ pool, migrationsDir, logger: createLogger() }),
    /lock failed/
  );

  const connection = pool.connections.at(-1);
  assert.equal(connection.rollbackCount, 1);
  assert.equal(connection.released, true);
  assert.equal(connection.destroyed, true);
});

test('a COMMIT error reports an ambiguous outcome and destroys the connection', async (t) => {
  const migrationsDir = await createMigrations({
    '018_first.sql': '-- migration:018_first.sql',
    '019_not_reached.sql': '-- migration:019_not_reached.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const commitError = new Error('commit response lost');
  const pool = new FakePool([], {
    COMMIT: commitError,
    commitApplied: true,
    commitOnlyForMigration: true,
  });

  await assert.rejects(
    runMigrations({ pool, migrationsDir, logger: createLogger() }),
    (error) => {
      assert.equal(error.name, 'MigrationCommitError');
      assert.equal(error.cause, commitError);
      assert.match(error.message, /resultado da transacção pode ser ambíguo/);
      assert.match(error.message, /Verifique schema_migrations/);
      return true;
    }
  );

  const connection = pool.connections.at(-1);
  assert.equal(connection.released, true);
  assert.equal(connection.destroyed, true);
  assert.deepEqual(pool.executedMigrations, ['018_first.sql']);
  assert.ok(pool.applied.has('018_first.sql'));
  assert.ok(!pool.executedMigrations.includes('019_not_reached.sql'));
});

test('a ROLLBACK error is preserved with the original error and destroys the connection', async (t) => {
  const migrationsDir = await createMigrations({
    '018_failure.sql': '-- migration:018_failure.sql\n-- fail',
    '019_not_reached.sql': '-- migration:019_not_reached.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const rollbackError = new Error('rollback failed');
  const pool = new FakePool([], { ROLLBACK: rollbackError });

  await assert.rejects(
    runMigrations({ pool, migrationsDir, logger: createLogger() }),
    (error) => {
      assert.ok(error instanceof AggregateError);
      assert.equal(error.errors[0].message, 'simulated migration failure');
      assert.equal(error.errors[1], rollbackError);
      return true;
    }
  );

  const connection = pool.connections.at(-1);
  assert.equal(connection.released, true);
  assert.equal(connection.destroyed, true);
  assert.ok(!pool.executedMigrations.includes('019_not_reached.sql'));
});

test('concurrent runner invocations apply a migration only once', async (t) => {
  const migrationsDir = await createMigrations({
    '018_once.sql': '-- migration:018_once.sql',
  });
  t.after(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));
  const pool = new FakePool();
  const options = { pool, migrationsDir, logger: createLogger() };

  const results = await Promise.all([
    runMigrations(options),
    runMigrations(options),
  ]);

  assert.equal(pool.executedMigrations.filter((name) => name === '018_once.sql').length, 1);
  assert.equal(pool.applied.has('018_once.sql'), true);
  assert.deepEqual(
    results.map((result) => result[0].applied).sort(),
    [false, true]
  );
});
