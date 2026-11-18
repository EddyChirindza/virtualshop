const test = require('node:test');
const assert = require('node:assert/strict');

test('notification feed and read updates are scoped to the authenticated user', async () => {
  const calls = [];
  const dbPath = require.resolve('../src/config/db');
  delete require.cache[require.resolve('../src/modules/notifications/notifications.service')];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async (sql, params) => {
        calls.push({ sql, params });
        if (sql.includes('COUNT(*)::int AS total')) return { rows: [{ total: 0 }] };
        if (sql.includes('INSERT INTO notification_reads')) return { rows: [], rowCount: 1 };
        if (sql.includes('SELECT n.id FROM notifications n WHERE n.id = $2')) return { rows: [{ id: 5 }] };
        return { rows: [] };
      },
    },
  };
  const service = require('../src/modules/notifications/notifications.service');
  await service.listForUser(42, { page: 1, limit: 10 });
  await service.markAsRead(42, 5);

  assert.ok(calls[0].sql.includes('n.recipient_user_id = $1'));
  assert.ok(calls[0].sql.includes('n.include_new_users = true'));
  assert.ok(calls[0].sql.includes('SELECT u.created_at FROM users u WHERE u.id = $1'));
  assert.deepEqual(calls[0].params, [42]);
  assert.ok(calls[1].sql.includes('nr.user_id = $1'));
  assert.deepEqual(calls[1].params, [42, 10, 0]);
  assert.deepEqual(calls[2].params, [42, 5]);
});

test('markAsRead is idempotent when the notification is already read', async () => {
  const calls = [];
  const dbPath = require.resolve('../src/config/db');
  delete require.cache[require.resolve('../src/modules/notifications/notifications.service')];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async (sql, params) => {
        calls.push({ sql, params });
        if (sql.includes('INSERT INTO notification_reads')) return { rows: [], rowCount: 0 };
        if (sql.includes('SELECT n.id FROM notifications n WHERE n.id = $2')) return { rows: [{ id: 5 }] };
        return { rows: [] };
      },
    },
  };
  const service = require('../src/modules/notifications/notifications.service');
  const result = await service.markAsRead(42, 5);
  assert.deepEqual(result, { id: 5, is_read: true });
  assert.equal(calls.length, 2);
  assert.ok(calls[0].sql.includes('ON CONFLICT (notification_id, user_id) DO NOTHING'));
});

test('markAsRead rejects invisible notifications', async () => {
  const dbPath = require.resolve('../src/config/db');
  delete require.cache[require.resolve('../src/modules/notifications/notifications.service')];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async (sql) => {
        if (sql.includes('INSERT INTO notification_reads')) return { rows: [], rowCount: 0 };
        if (sql.includes('SELECT n.id FROM notifications n WHERE n.id = $2')) return { rows: [] };
        return { rows: [] };
      },
    },
  };
  const service = require('../src/modules/notifications/notifications.service');
  await assert.rejects(() => service.markAsRead(42, 5), (err) => err && err.statusCode === 404);
});
