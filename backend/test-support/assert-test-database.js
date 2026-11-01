const env = require('../src/config/env');

function assertIsolatedTestDatabase() {
  const configuredTestDatabase = process.env.TEST_DB_NAME;
  const isTestNamedDatabase = /(^|[_-])test($|[_-])/i.test(env.db.database);
  if (
    env.nodeEnv !== 'test' ||
    !configuredTestDatabase ||
    env.db.database !== configuredTestDatabase ||
    !isTestNamedDatabase
  ) {
    throw new Error(
      'Operação de integração bloqueada: define NODE_ENV=test, TEST_DB_NAME e DB_NAME igual a uma base exclusiva cujo nome contenha "test".'
    );
  }
}

module.exports = { assertIsolatedTestDatabase };
