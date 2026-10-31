const test = require('node:test');
const assert = require('node:assert/strict');

const { query } = require('../src/config/db');
const cartService = require('../src/modules/cart/cart.service');
const orderService = require('../src/modules/orders/order.service');
const notificationsService = require('../src/modules/notifications/notifications.service');
const paymentMethodsService = require('../src/modules/payment_methods/payment_methods.service');

async function resetDb() {
  await query('DELETE FROM notifications');
  await query('DELETE FROM favorites');
  await query('DELETE FROM cart_items');
  await query('DELETE FROM carts');
  await query('DELETE FROM order_items');
  await query('DELETE FROM orders');
  await query('DELETE FROM payment_methods');
  await query('DELETE FROM addresses');
  await query('DELETE FROM products');
  await query('DELETE FROM categories');
  await query('DELETE FROM users');

  const { rows: categoryRows } = await query(
    `INSERT INTO categories (name, slug) VALUES ('Orders Category', 'orders-category') RETURNING id`
  );
  const { rows: userRows } = await query(
    `INSERT INTO users (full_name, phone, email, password_hash, role)
     VALUES
       ('Cliente Pedidos', '+258860000001', 'orders.customer@example.com', 'unused', 'customer'),
       ('Outro Cliente', '+258860000002', 'orders.other@example.com', 'unused', 'customer'),
       ('Admin Pedidos', '+258860000003', 'orders.admin@example.com', 'unused', 'admin')
     RETURNING id, role`
  );
  const { rows: productRows } = await query(
    `INSERT INTO products (name, description, price, stock, image_url, category_id, rating, is_popular, is_new_arrival)
     VALUES ('Produto Pedidos', 'Produto de teste', 500, 10, 'https://example.com/order.png', $1, 5, true, true)
     RETURNING id, stock`,
    [categoryRows[0].id]
  );
  const customerId = userRows[0].id;
  const otherCustomerId = userRows[1].id;
  const adminId = userRows[2].id;

  const { rows: addressRows } = await query(
    `INSERT INTO addresses (user_id, label, street, city, is_default)
     VALUES ($1, 'Casa', 'Av. Central', 'Maputo', true)
     RETURNING id`,
    [customerId]
  );

  const paymentMethod = await paymentMethodsService.createPaymentMethod(customerId, {
    type: 'mpesa',
    label: 'M-Pesa Pedidos',
    phone: '+258861111111',
  });

  return {
    customerId,
    otherCustomerId,
    adminId,
    productId: productRows[0].id,
    addressId: addressRows[0].id,
    paymentMethodId: paymentMethod.id,
  };
}

async function createOrder(context, { quantity = 2, home = true } = {}) {
  await cartService.addItem(context.customerId, {
    productId: context.productId,
    quantity,
  });
  return orderService.checkout(context.customerId, {
    deliveryAddressId: home ? context.addressId : null,
    paymentMethodId: context.paymentMethodId,
    deliveryMethod: home ? 'home_delivery' : 'store_pickup',
    notes: home ? null : 'Levantamento na loja',
  });
}

test('pedido pago aparece na lista administrativa e no detalhe com dados completos', async () => {
  const context = await resetDb();
  const created = await createOrder(context);

  const list = await orderService.listOrdersForAdmin({ page: 1, limit: 50 });
  const item = list.items.find((order) => order.id === created.id);

  assert.ok(item);
  assert.equal(item.status, 'pending');
  assert.equal(item.paymentStatus, 'paid');
  assert.equal(item.deliveryMethod, 'home_delivery');
  assert.equal(item.customer.name, 'Cliente Pedidos');
  assert.equal(item.paymentMethod.type, 'mpesa');
  assert.equal(item.address.city, 'Maputo');
  assert.equal(item.items[0].quantity, 2);

  const detail = await orderService.getOrderForAdmin(created.id);
  assert.equal(detail.total, 1050);
  assert.equal(detail.customer.phone, '+258860000001');
  assert.equal(detail.items[0].product.name, 'Produto Pedidos');
});

test('aceitar pedido notifica o cliente uma única vez e permite progressão válida', async () => {
  const context = await resetDb();
  const created = await createOrder(context);

  const accepted = await orderService.acceptOrder(context.adminId, created.id);
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.paymentStatus, 'paid');

  let unread = await notificationsService.getUnreadCount(context.customerId);
  assert.equal(unread.count, 1);

  const feed = await notificationsService.listForUser(context.customerId, {
    page: 1,
    limit: 20,
  });
  assert.equal(feed.items[0].order_id, created.id);
  assert.equal(feed.items[0].title, 'Pedido aceite!');
  assert.match(feed.items[0].message, new RegExp(`#${created.id}`));

  await orderService.acceptOrder(context.adminId, created.id);
  const { rows: duplicateRows } = await query(
    'SELECT COUNT(*)::int AS total FROM notifications WHERE order_id = $1',
    [created.id]
  );
  assert.equal(duplicateRows[0].total, 1);

  await orderService.updateOrderStatus(context.adminId, created.id, 'preparing');
  await orderService.updateOrderStatus(context.adminId, created.id, 'out_for_delivery');
  const completed = await orderService.updateOrderStatus(
    context.adminId,
    created.id,
    'completed'
  );
  assert.equal(completed.status, 'completed');

  unread = await notificationsService.getUnreadCount(context.customerId);
  assert.equal(unread.count, 4);

  const customerList = await orderService.listOrdersForUser(context.customerId);
  assert.equal(customerList[0].id, created.id);
  assert.equal(customerList[0].status, 'completed');

  await assert.rejects(
    () => orderService.getOrderById(context.otherCustomerId, created.id),
    (err) => err.statusCode === 403
  );
});

test('rejeição exige motivo, notifica o cliente e repõe stock sem alterar pagamento', async () => {
  const context = await resetDb();
  const created = await createOrder(context, { quantity: 3, home: false });

  const { rows: beforeRows } = await query(
    'SELECT stock FROM products WHERE id = $1',
    [context.productId]
  );
  assert.equal(Number(beforeRows[0].stock), 7);

  const rejected = await orderService.rejectOrder(
    context.adminId,
    created.id,
    'Produto indisponível'
  );
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.paymentStatus, 'paid');
  assert.equal(rejected.rejectionReason, 'Produto indisponível');

  const { rows: afterRows } = await query(
    'SELECT stock FROM products WHERE id = $1',
    [context.productId]
  );
  assert.equal(Number(afterRows[0].stock), 10);

  const feed = await notificationsService.listForUser(context.customerId, {
    page: 1,
    limit: 20,
  });
  assert.equal(feed.items[0].title, 'Pedido rejeitado.');
  assert.match(feed.items[0].message, /Produto indisponível/);

  await assert.rejects(
    () => orderService.updateOrderStatus(context.adminId, created.id, 'preparing'),
    (err) => err.statusCode === 409 && err.code === 'INVALID_ORDER_TRANSITION'
  );
});

test('estados de entrega respeitam a modalidade escolhida', async () => {
  const context = await resetDb();
  const created = await createOrder(context, { home: false });
  await orderService.acceptOrder(context.adminId, created.id);
  await orderService.updateOrderStatus(context.adminId, created.id, 'preparing');

  await assert.rejects(
    () => orderService.updateOrderStatus(context.adminId, created.id, 'out_for_delivery'),
    (err) => err.statusCode === 409
  );

  const ready = await orderService.updateOrderStatus(
    context.adminId,
    created.id,
    'ready_for_pickup'
  );
  assert.equal(ready.status, 'ready_for_pickup');
});
