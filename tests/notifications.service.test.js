const test = require('node:test');
const assert = require('node:assert/strict');

test('notification feed and read updates are scoped to the authenticated user', async () => {
  const calls = [];
  const dbPath = require.resolve('../src/config/db');
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async (sql, params) => {
        calls.push({ sql, params });
        if (sql.includes('COUNT(*)::int AS total')) return { rows: [{ total: 0 }] };
        if (sql.includes('INSERT INTO notification_reads')) return { rows: [], rowCount: 1 };
        if (sql.includes('SELECT n.id FROM notifications')) return { rows: [{ id: 5 }] };
        return { rows: [] };
      },
    },
  };
  const service = require('../src/modules/notifications/notifications.service');
  await service.listForUser(42, { page: 1, limit: 10 });
  await service.markAsRead(42, 5);

  assert.ok(calls[0].sql.includes('n.recipient_user_id = $1'));
  assert.deepEqual(calls[0].params, [42]);
  assert.ok(calls[1].sql.includes('nr.user_id = $1'));
  assert.deepEqual(calls[1].params, [42, 10, 0]);
  assert.deepEqual(calls[2].params, [42, 5]);
});
