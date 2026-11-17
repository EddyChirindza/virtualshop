const test = require('node:test');
const assert = require('node:assert/strict');
const { createNotificationSchema, paginationSchema } = require('../src/modules/notifications/notifications.validators');

test('accepts a published product notification from the admin form', () => {
  const result = createNotificationSchema.parse({
    title: 'Novo produto disponível',
    message: 'Novo produto disponível: Mochila',
    type: 'new_product',
    product_id: 12,
    recipient_scope: 'all_customers',
    status: 'published',
    idempotency_key: 'product:12:new_product',
  });
  assert.equal(result.product_id, 12);
  assert.equal(result.status, 'published');
  assert.equal(result.include_new_users, false);
});

test('rejects invalid lengths, types and unsafe recipient combinations', () => {
  assert.throws(() => createNotificationSchema.parse({
    title: 'x'.repeat(101), message: 'Message', type: 'general',
  }));
  assert.throws(() => createNotificationSchema.parse({
    title: 'Title', message: 'Message', type: 'general',
    recipient_scope: 'user',
  }));
  assert.throws(() => createNotificationSchema.parse({
    title: 'Title', message: 'Message', type: 'unknown',
  }));
});

test('applies bounded defaults for pagination', () => {
  assert.deepEqual(paginationSchema.parse({}), { page: 1, limit: 30 });
  assert.throws(() => paginationSchema.parse({ limit: '1000' }));
});

test('accepts explicit include_new_users for global notifications and rejects for targeted ones', () => {
  const global = createNotificationSchema.parse({
    title: 'Campanha',
    message: 'Para todos incluindo novos',
    type: 'general',
    recipient_scope: 'all_customers',
    include_new_users: true,
  });
  assert.equal(global.include_new_users, true);
  assert.throws(() => createNotificationSchema.parse({
    title: 'Individual',
    message: 'Destino único',
    type: 'general',
    recipient_scope: 'user',
    recipient_user_id: 7,
    include_new_users: true,
  }));
});
