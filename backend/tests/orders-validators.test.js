const test = require('node:test');
const assert = require('node:assert/strict');

const {
  checkoutSchema,
  rejectOrderSchema,
  updateOrderStatusSchema,
  listOrdersQuerySchema,
} = require('../src/modules/orders/order.validators');
const {
  isTransitionAllowed,
  allowedTransitions,
  statusNotification,
} = require('../src/modules/orders/order.status');

test('checkout aceita método de pagamento e modalidade de entrega', () => {
  const parsed = checkoutSchema.parse({
    deliveryAddressId: 4,
    paymentMethodId: 7,
    deliveryMethod: 'home_delivery',
  });
  assert.equal(parsed.paymentMethodId, 7);
  assert.equal(parsed.deliveryMethod, 'home_delivery');
});

test('rejeição exige motivo com pelo menos 3 caracteres', () => {
  assert.equal(
    rejectOrderSchema.parse({ reason: '  Sem stock  ' }).reason,
    'Sem stock'
  );
  assert.throws(() => rejectOrderSchema.parse({ reason: 'x' }));
});

test('atualização de estado rejeita estados administrativos reservados', () => {
  assert.equal(
    updateOrderStatusSchema.parse({ status: 'preparing' }).status,
    'preparing'
  );
  assert.throws(() => updateOrderStatusSchema.parse({ status: 'accepted' }));
  assert.throws(() => updateOrderStatusSchema.parse({ status: 'rejected' }));
});

test('filtros de pedidos convertem vazios e validam datas', () => {
  const parsed = listOrdersQuerySchema.parse({
    status: '',
    search: '',
    page: '2',
    limit: '10',
  });
  assert.equal(parsed.status, undefined);
  assert.equal(parsed.page, 2);
  assert.throws(() =>
    listOrdersQuerySchema.parse({ from: '2026-05-10', to: '2026-05-01' })
  );
});

test('transições seguem a modalidade e não permitem saltos arbitrários', () => {
  assert.equal(isTransitionAllowed('pending', 'accepted', 'store_pickup'), true);
  assert.equal(isTransitionAllowed('pending', 'preparing', 'store_pickup'), false);
  assert.equal(isTransitionAllowed('preparing', 'ready_for_pickup', 'store_pickup'), true);
  assert.equal(isTransitionAllowed('preparing', 'ready_for_pickup', 'home_delivery'), false);
  assert.equal(isTransitionAllowed('preparing', 'out_for_delivery', 'home_delivery'), true);
  assert.equal(isTransitionAllowed('preparing', 'out_for_delivery', 'store_pickup'), false);
  assert.deepEqual(allowedTransitions('completed', 'home_delivery'), []);
});

test('mensagens de notificação incluem o número e o motivo da rejeição', () => {
  const accepted = statusNotification(42, 'accepted');
  assert.equal(accepted.title, 'Pedido aceite!');
  assert.match(accepted.message, /#42/);

  const rejected = statusNotification(42, 'rejected', 'Sem stock');
  assert.equal(rejected.title, 'Pedido rejeitado.');
  assert.match(rejected.message, /Motivo: Sem stock/);
});
