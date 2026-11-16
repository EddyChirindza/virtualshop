const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertIsolatedTestDatabase,
  assertConnectedTestDatabase,
} = require('../test-support/assert-test-database');
const { startServer } = require('../server');

const protectedDatabase = 'virtualshop_db';

function makeOptions(overrides = {}) {
  const variables = {
    NODE_ENV: 'test',
    TEST_DB_NAME: 'virtualshop_test_unit',
    TEST_DB_HOST: '127.0.0.1',
    TEST_DB_PORT: '5432',
    TEST_DB_USER: 'virtualshop_test_unit',
    TEST_DB_PASSWORD: 'synthetic-test-password',
    ...overrides.variables,
  };
  const runtimeEnv = {
    nodeEnv: variables.NODE_ENV,
    db: {
      database: variables.TEST_DB_NAME,
      host: variables.TEST_DB_HOST,
      port: Number(variables.TEST_DB_PORT),
      user: variables.TEST_DB_USER,
      password: variables.TEST_DB_PASSWORD,
      ...overrides.runtimeDb,
    },
    ...overrides.runtimeEnv,
  };
  return {
    variables,
    runtimeEnv,
    backendDatabaseName: protectedDatabase,
    ...overrides.options,
  };
}

function safeConnection(overrides = {}) {
  return {
    database_name: 'virtualshop_test_unit',
    database_user: 'virtualshop_test_unit',
    is_superuser: false,
    can_create_database: false,
    can_create_roles: false,
    can_replicate: false,
    can_bypass_rls: false,
    can_assume_privileged_role: false,
    ...overrides,
  };
}

function safeProtectedPrivileges(overrides = {}) {
  return {
    database_name: protectedDatabase,
    database_user: 'virtualshop_test_unit',
    is_superuser: false,
    can_create_database: false,
    can_create_roles: false,
    can_replicate: false,
    can_bypass_rls: false,
    can_assume_privileged_role: false,
    can_create_schema: false,
    can_create_in_schema: false,
    can_write_table: false,
    can_write_columns: false,
    can_write_sequences: false,
    can_execute_security_definer: false,
    ...overrides,
  };
}

function makeConnectedMocks({
  connection = safeConnection(),
  protectedPrivileges = safeProtectedPrivileges(),
  protectedQueryError,
} = {}) {
  let protectedPoolEnded = false;
  const pool = {
    async query() {
      return { rows: [connection] };
    },
  };
  const createPool = (config) => {
    assert.equal(config.database, protectedDatabase);
    return {
      async query() {
        if (protectedQueryError) throw protectedQueryError;
        return { rows: [protectedPrivileges] };
      },
      async end() {
        protectedPoolEnded = true;
      },
    };
  };
  return {
    pool,
    createPool,
    wasProtectedPoolEnded: () => protectedPoolEnded,
  };
}

test('rejects the persistent database name', () => {
  const options = makeOptions({
    variables: { TEST_DB_NAME: protectedDatabase },
    runtimeDb: { database: protectedDatabase },
  });
  assert.throws(
    () => assertIsolatedTestDatabase(options),
    /different.*virtualshop_db|virtualshop_test_\*/
  );
});

test('rejects virtualshop_test without an authorized suffix', () => {
  const options = makeOptions({
    variables: { TEST_DB_NAME: 'virtualshop_test' },
    runtimeDb: { database: 'virtualshop_test' },
  });
  assert.throws(() => assertIsolatedTestDatabase(options), /virtualshop_test_\*/);
});

test('rejects a NODE_ENV other than test', () => {
  const options = makeOptions({
    variables: { NODE_ENV: 'development' },
    runtimeDb: {},
  });
  assert.throws(() => assertIsolatedTestDatabase(options), /NODE_ENV.*test/);
});

test('rejects when the loaded runtime is not in test mode', () => {
  const options = makeOptions({
    runtimeEnv: { nodeEnv: 'development' },
  });
  assert.throws(() => assertIsolatedTestDatabase(options), /NODE_ENV.*test/);
});

test('rejects configured database names that do not match TEST_DB_NAME', () => {
  const options = makeOptions({
    runtimeDb: { database: 'virtualshop_test_other' },
  });
  assert.throws(() => assertIsolatedTestDatabase(options), /TEST_DB_NAME.*DB_NAME/);
});

test('rejects users that do not match TEST_DB_USER', () => {
  const options = makeOptions({
    runtimeDb: { user: 'different_test_user' },
  });
  assert.throws(() => assertIsolatedTestDatabase(options), /TEST_DB_USER/);
});

test('rejects a superuser connected to the test database', async () => {
  const mocks = makeConnectedMocks({
    connection: safeConnection({ is_superuser: true }),
  });
  await assert.rejects(
    assertConnectedTestDatabase(mocks.pool, {
      ...makeOptions(),
      createPool: mocks.createPool,
    }),
    /SUPERUSER/
  );
});

test('rejects users with elevated role attributes or membership', async () => {
  for (const privilege of [
    'can_create_database',
    'can_create_roles',
    'can_replicate',
    'can_bypass_rls',
    'can_assume_privileged_role',
  ]) {
    const mocks = makeConnectedMocks({
      connection: safeConnection({ [privilege]: true }),
    });
    await assert.rejects(
      assertConnectedTestDatabase(mocks.pool, {
        ...makeOptions(),
        createPool: mocks.createPool,
      }),
      /privilégios elevados/
    );
  }
});

test('rejects when role privilege checks are missing', async () => {
  const connection = safeConnection();
  delete connection.can_bypass_rls;
  const mocks = makeConnectedMocks({ connection });
  await assert.rejects(
    assertConnectedTestDatabase(mocks.pool, {
      ...makeOptions(),
      createPool: mocks.createPool,
    }),
    /não foi possível confirmar todas as permissões/
  );
});

test('rejects a live connection to the wrong database or user', async () => {
  for (const connection of [
    safeConnection({ database_name: protectedDatabase }),
    safeConnection({ database_user: 'unexpected_user' }),
  ]) {
    const mocks = makeConnectedMocks({ connection });
    await assert.rejects(
      assertConnectedTestDatabase(mocks.pool, {
        ...makeOptions(),
        createPool: mocks.createPool,
      }),
      /ligação PostgreSQL activa/
    );
  }
});

test('rejects when protected database permissions cannot be confirmed', async () => {
  const mocks = makeConnectedMocks({
    protectedQueryError: new Error('permission catalogue unavailable'),
  });
  await assert.rejects(
    assertConnectedTestDatabase(mocks.pool, {
      ...makeOptions(),
      createPool: mocks.createPool,
    }),
    /permission catalogue unavailable/
  );
  assert.equal(mocks.wasProtectedPoolEnded(), true);
});

test('rejects write privileges on the persistent database', async () => {
  for (const privilege of [
    'can_create_schema',
    'can_create_in_schema',
    'can_write_table',
    'can_write_columns',
    'can_write_sequences',
    'can_execute_security_definer',
  ]) {
    const mocks = makeConnectedMocks({
      protectedPrivileges: safeProtectedPrivileges({ [privilege]: true }),
    });
    await assert.rejects(
      assertConnectedTestDatabase(mocks.pool, {
        ...makeOptions(),
        createPool: mocks.createPool,
      }),
      /permissões de escrita em virtualshop_db/
    );
  }
});

test('rejects when protected database privilege checks are missing', async () => {
  const protectedPrivileges = safeProtectedPrivileges();
  delete protectedPrivileges.can_write_sequences;
  const mocks = makeConnectedMocks({ protectedPrivileges });
  await assert.rejects(
    assertConnectedTestDatabase(mocks.pool, {
      ...makeOptions(),
      createPool: mocks.createPool,
    }),
    /não foi possível confirmar todas as permissões/
  );
  assert.equal(mocks.wasProtectedPoolEnded(), true);
});

test('accepts a matching non-privileged test connection with no persistent write access', async () => {
  const mocks = makeConnectedMocks();
  await assert.doesNotReject(
    assertConnectedTestDatabase(mocks.pool, {
      ...makeOptions(),
      createPool: mocks.createPool,
    })
  );
  assert.equal(mocks.wasProtectedPoolEnded(), true);
});

test('does not listen in test mode when database protection rejects the connection', async () => {
  let listenCalled = false;
  await assert.rejects(
    startServer({
      application: {
        listen() {
          listenCalled = true;
        },
      },
      runtime: { nodeEnv: 'test', host: '127.0.0.1', port: 3002 },
      databasePool: {},
      validateTestDatabase: async () => {
        throw new Error('unsafe database');
      },
    }),
    /unsafe database/
  );
  assert.equal(listenCalled, false);
});

test('validates database before listening in test mode', async () => {
  const events = [];
  const server = { marker: 'server' };
  const result = await startServer({
    application: {
      listen(hostPort, host, callback) {
        events.push(`listen:${hostPort}:${host}`);
        callback();
        return server;
      },
    },
    runtime: { nodeEnv: 'test', host: '127.0.0.1', port: 3002 },
    databasePool: {},
    validateTestDatabase: async () => {
      events.push('validate');
    },
  });
  assert.deepEqual(events, ['validate', 'listen:3002:127.0.0.1']);
  assert.equal(result, server);
});

test('does not change startup validation for development mode', async () => {
  let validationCalled = false;
  const server = { marker: 'server' };
  const result = await startServer({
    application: {
      listen(_port, _host, callback) {
        callback();
        return server;
      },
    },
    runtime: { nodeEnv: 'development', host: '0.0.0.0', port: 3000 },
    databasePool: {},
    validateTestDatabase: async () => {
      validationCalled = true;
    },
  });
  assert.equal(validationCalled, false);
  assert.equal(result, server);
});
