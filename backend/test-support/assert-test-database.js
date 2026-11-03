const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const dotenv = require('dotenv');
const env = require('../src/config/env');

const backendEnvPath = path.join(__dirname, '..', '.env');

function isLoopbackHost(host) {
  const normalized = host.replace(/^\[|\]$/g, '').toLowerCase();
  return normalized === 'localhost' || normalized === '::1' ||
    (net.isIP(normalized) === 4 && normalized.startsWith('127.'));
}

function assertIsolatedTestDatabase() {
  const expectedName = process.env.TEST_DB_NAME;
  const expectedHost = process.env.TEST_DB_HOST;
  const expectedPort = Number(process.env.TEST_DB_PORT);
  const expectedUser = process.env.TEST_DB_USER;
  const expectedPassword = process.env.TEST_DB_PASSWORD;
  const testNamePattern = /^virtualshop_test_[a-z0-9_]+$/i;
  const configuredTestDatabase =
    fs.existsSync(backendEnvPath)
      ? dotenv.parse(fs.readFileSync(backendEnvPath)).DB_NAME
      : null;

  if (
    env.nodeEnv !== 'test' ||
    !expectedName ||
    !testNamePattern.test(expectedName) ||
    env.db.database !== expectedName ||
    !expectedHost ||
    !isLoopbackHost(expectedHost) ||
    env.db.host !== expectedHost ||
    !Number.isInteger(expectedPort) ||
    expectedPort < 1 ||
    env.db.port !== expectedPort ||
    !expectedUser ||
    env.db.user !== expectedUser ||
    !expectedPassword ||
    env.db.password !== expectedPassword ||
    (configuredTestDatabase && env.db.database === configuredTestDatabase)
  ) {
    throw new Error(
      'Operação bloqueada: configura explicitamente NODE_ENV=test e TEST_DB_NAME/HOST/PORT/USER/PASSWORD para uma base local virtualshop_test_* diferente da base definida em backend/.env.'
    );
  }
}

async function assertConnectedTestDatabase(pool) {
  assertIsolatedTestDatabase();
  const { rows } = await pool.query(
    'SELECT current_database() AS database_name, current_user AS database_user'
  );
  const connection = rows[0];
  if (
    connection.database_name !== process.env.TEST_DB_NAME ||
    connection.database_user !== process.env.TEST_DB_USER
  ) {
    throw new Error(
      'Operação bloqueada: a ligação PostgreSQL activa não corresponde à base de teste local explicitamente configurada.'
    );
  }
}

module.exports = {
  assertIsolatedTestDatabase,
  assertConnectedTestDatabase,
};
