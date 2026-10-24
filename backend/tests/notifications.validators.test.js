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
