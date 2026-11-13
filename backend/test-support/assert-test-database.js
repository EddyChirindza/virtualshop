const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const env = require('../src/config/env');

const PROTECTED_DATABASE_NAME = 'virtualshop_db';
const backendEnvPath = path.join(__dirname, '..', '.env');

const CURRENT_CONNECTION_SQL = `
  SELECT current_database() AS database_name,
         current_user AS database_user,
         role.rolsuper AS is_superuser,
         role.rolcreatedb AS can_create_database,
         role.rolcreaterole AS can_create_roles,
         role.rolreplication AS can_replicate,
         role.rolbypassrls AS can_bypass_rls,
         EXISTS (
           SELECT 1
           FROM pg_roles privileged_role
           WHERE (privileged_role.rolsuper
             OR privileged_role.rolcreatedb
             OR privileged_role.rolcreaterole
             OR privileged_role.rolreplication
             OR privileged_role.rolbypassrls)
             AND pg_has_role(role.oid, privileged_role.oid, 'MEMBER')
         ) AS can_assume_privileged_role
  FROM pg_roles role
  WHERE role.rolname = current_user
`;

const PROTECTED_DATABASE_PRIVILEGES_SQL = `
  WITH effective_principals AS (
    SELECT oid
    FROM pg_roles
    WHERE rolname = current_user
    UNION
    SELECT role.oid
    FROM pg_roles role
    WHERE pg_has_role(current_user, role.oid, 'MEMBER')
  )
  SELECT current_database() AS database_name,
         current_user AS database_user,
         EXISTS (
           SELECT 1
           FROM effective_principals principal
           WHERE has_database_privilege(
             principal.oid, current_database(), 'CREATE'
           )
         ) AS can_create_schema,
         COALESCE((
           SELECT bool_or(
             has_schema_privilege(principal.oid, namespace.oid, 'CREATE')
           )
           FROM pg_namespace namespace
           CROSS JOIN effective_principals principal
           WHERE namespace.nspname <> 'information_schema'
             AND namespace.nspname NOT LIKE 'pg_%'
         ), false) AS can_create_in_schema,
         COALESCE((
           SELECT bool_or(
             has_table_privilege(principal.oid, relation.oid, privilege.name)
           )
           FROM pg_class relation
           JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
           CROSS JOIN effective_principals principal
           CROSS JOIN (VALUES
             ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
             ('REFERENCES'), ('TRIGGER')
           ) AS privilege(name)
           WHERE namespace.nspname <> 'information_schema'
             AND namespace.nspname NOT LIKE 'pg_%'
             AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
         ), false) AS can_write_table,
         COALESCE((
           SELECT bool_or(
             has_any_column_privilege(principal.oid, relation.oid, privilege.name)
           )
           FROM pg_class relation
           JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
           CROSS JOIN effective_principals principal
           CROSS JOIN (VALUES ('INSERT'), ('UPDATE')) AS privilege(name)
           WHERE namespace.nspname <> 'information_schema'
             AND namespace.nspname NOT LIKE 'pg_%'
             AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
         ), false) AS can_write_columns,
         COALESCE((
           SELECT bool_or(
             has_sequence_privilege(principal.oid, relation.oid, 'USAGE')
             OR has_sequence_privilege(principal.oid, relation.oid, 'UPDATE')
           )
           FROM pg_class relation
           JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
           CROSS JOIN effective_principals principal
           WHERE namespace.nspname <> 'information_schema'
             AND namespace.nspname NOT LIKE 'pg_%'
             AND relation.relkind = 'S'
         ), false) AS can_write_sequences,
         COALESCE((
           SELECT bool_or(
             has_function_privilege(principal.oid, routine.oid, 'EXECUTE')
           )
           FROM pg_proc routine
           JOIN pg_namespace namespace ON namespace.oid = routine.pronamespace
           CROSS JOIN effective_principals principal
           WHERE namespace.nspname <> 'information_schema'
             AND namespace.nspname NOT LIKE 'pg_%'
             AND routine.prosecdef
         ), false) AS can_execute_security_definer
`;

function isLoopbackHost(host) {
  if (typeof host !== 'string') return false;
  const normalized = host.replace(/^\[|\]$/g, '').toLowerCase();
  return normalized === 'localhost' || normalized === '::1' ||
    (require('node:net').isIP(normalized) === 4 && normalized.startsWith('127.'));
}

function readBackendDatabaseName() {
  if (!fs.existsSync(backendEnvPath)) return null;
  return dotenv.parse(fs.readFileSync(backendEnvPath)).DB_NAME || null;
}

function assertIsolatedTestDatabase({
  runtimeEnv = env,
  variables = process.env,
  backendDatabaseName = readBackendDatabaseName(),
} = {}) {
  const expectedName = variables.TEST_DB_NAME;
  const expectedPort = Number(variables.TEST_DB_PORT);
  const testNamePattern = /^virtualshop_test_[a-z0-9_]+$/i;

  if (runtimeEnv.nodeEnv !== 'test' || variables.NODE_ENV !== 'test') {
    throw new Error('Operação bloqueada: NODE_ENV tem de ser test.');
  }
  if (
    !expectedName ||
    !testNamePattern.test(expectedName) ||
    expectedName === PROTECTED_DATABASE_NAME ||
    runtimeEnv.db.database !== expectedName ||
    (backendDatabaseName && expectedName === backendDatabaseName)
  ) {
    throw new Error(
      `Operação bloqueada: TEST_DB_NAME e DB_NAME têm de identificar a mesma base virtualshop_test_* e ser diferente de ${PROTECTED_DATABASE_NAME}.`
    );
  }
  if (
    !variables.TEST_DB_HOST ||
    !isLoopbackHost(variables.TEST_DB_HOST) ||
    runtimeEnv.db.host !== variables.TEST_DB_HOST
  ) {
    throw new Error('Operação bloqueada: TEST_DB_HOST/DB_HOST têm de ser o mesmo host loopback.');
  }
  if (
    !Number.isInteger(expectedPort) ||
    expectedPort < 1 ||
    expectedPort > 65535 ||
    runtimeEnv.db.port !== expectedPort
  ) {
    throw new Error('Operação bloqueada: TEST_DB_PORT/DB_PORT têm de ser a mesma porta válida.');
  }
  if (
    !variables.TEST_DB_USER ||
    runtimeEnv.db.user !== variables.TEST_DB_USER ||
    !variables.TEST_DB_PASSWORD ||
    runtimeEnv.db.password !== variables.TEST_DB_PASSWORD
  ) {
    throw new Error('Operação bloqueada: credenciais DB_* não correspondem a TEST_DB_USER/TEST_DB_PASSWORD.');
  }
}

function assertNoElevatedRolePrivileges(connection, databaseLabel) {
  const checks = new Map([
    ['is_superuser', 'SUPERUSER'],
    ['can_create_database', 'CREATEDB'],
    ['can_create_roles', 'CREATEROLE'],
    ['can_replicate', 'REPLICATION'],
    ['can_bypass_rls', 'BYPASSRLS'],
    ['can_assume_privileged_role', 'membership in a privileged role'],
  ]);
  assertBooleanChecks(connection, checks.keys(), databaseLabel);
  const elevated = [...checks]
    .filter(([key]) => connection[key])
    .map(([, label]) => label);

  if (elevated.length) {
    throw new Error(
      `Operação bloqueada: o utilizador ligado à base ${databaseLabel} tem privilégios elevados (${elevated.join(', ')}).`
    );
  }
}

function assertNoProtectedDatabaseWrites(privileges) {
  const checks = new Map([
    ['can_create_schema', 'database CREATE'],
    ['can_create_in_schema', 'schema CREATE'],
    ['can_write_table', 'table write'],
    ['can_write_columns', 'column write'],
    ['can_write_sequences', 'sequence write'],
    ['can_execute_security_definer', 'security-definer function execution'],
  ]);
  assertBooleanChecks(privileges, checks.keys(), PROTECTED_DATABASE_NAME);
  const writable = [...checks].filter(([key]) => privileges[key]);

  if (writable.length) {
    throw new Error(
      `Operação bloqueada: o utilizador de teste tem permissões de escrita em ${PROTECTED_DATABASE_NAME} (${writable.map(([, label]) => label).join(', ')}).`
    );
  }
}

function assertBooleanChecks(result, keys, databaseLabel) {
  const unconfirmed = [...keys].filter((key) => typeof result[key] !== 'boolean');
  if (unconfirmed.length) {
    throw new Error(
      `Operação bloqueada: não foi possível confirmar todas as permissões de ${databaseLabel} (${unconfirmed.join(', ')}).`
    );
  }
}

async function assertConnectedTestDatabase(
  pool,
  {
    runtimeEnv = env,
    variables = process.env,
    backendDatabaseName = readBackendDatabaseName(),
    createPool = (config) => new Pool(config),
  } = {}
) {
  assertIsolatedTestDatabase({ runtimeEnv, variables, backendDatabaseName });

  const { rows } = await pool.query(CURRENT_CONNECTION_SQL);
  const connection = rows[0];
  if (
    !connection ||
    connection.database_name !== variables.TEST_DB_NAME ||
    connection.database_user !== variables.TEST_DB_USER
  ) {
    throw new Error(
      'Operação bloqueada: a ligação PostgreSQL activa não corresponde à base/utilizador de teste configurados.'
    );
  }
  assertNoElevatedRolePrivileges(connection, variables.TEST_DB_NAME);

  const protectedPool = createPool({
    ...runtimeEnv.db,
    database: PROTECTED_DATABASE_NAME,
    connectionTimeoutMillis: 5000,
    max: 1,
  });
  try {
    const protectedResult = await protectedPool.query(
      PROTECTED_DATABASE_PRIVILEGES_SQL
    );
    const protectedConnection = protectedResult.rows[0];
    if (
      !protectedConnection ||
      protectedConnection.database_name !== PROTECTED_DATABASE_NAME ||
      protectedConnection.database_user !== variables.TEST_DB_USER
    ) {
      throw new Error(
        `Operação bloqueada: não foi possível confirmar permissões efectivas em ${PROTECTED_DATABASE_NAME}.`
      );
    }
    assertNoElevatedRolePrivileges(protectedConnection, PROTECTED_DATABASE_NAME);
    assertNoProtectedDatabaseWrites(protectedConnection);
  } finally {
    await protectedPool.end();
  }
}

module.exports = {
  assertIsolatedTestDatabase,
  assertConnectedTestDatabase,
};
