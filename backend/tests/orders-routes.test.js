const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { pool, query } = require('../src/config/db');
const { generateAccessToken } = require('../src/utils/tokens');
const cartService = require('../src/modules/cart/cart.service');
const orderService = require('../src/modules/orders/order.service');
const app = require('../src/app');
const { assertConnectedTestDatabase } = require('../test-support/assert-test-database');

async function resetDb() {
  await assertConnectedTestDatabase(pool);
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
    `INSERT INTO categories (name, slug) VALUES ('Routes Category', 'routes-category') RETURNING id`
  );
  const { rows: userRows } = await query(
    `INSERT INTO users (full_name, phone, email, password_hash, role)
     VALUES
       ('Cliente Rotas', '+258870000001', 'routes.customer@example.com', 'unused', 'customer'),
       ('Outro Cliente Rotas', '+258870000002', 'routes.other@example.com', 'unused', 'customer'),
       ('Admin Rotas', '+258870000003', 'routes.admin@example.com', 'unused', 'admin')
     RETURNING id, role`
  );
  const sessions = await Promise.all(userRows.map(async (user) => {
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, now() + interval \'1 day\')',
      [id, user.id]
    );
    return id;
  }));
  const { rows: productRows } = await query(
    `INSERT INTO products (name, description, price, stock, image_url, category_id, rating)
     VALUES ('Produto Rotas', 'Teste', 500, 10, 'https://example.com/r.png', $1, 5)
     RETURNING id`,
    [categoryRows[0].id]
  );

  return {
    customerId: userRows[0].id,
    customerSessionId: sessions[0],
    otherCustomerId: userRows[1].id,
    otherCustomerSessionId: sessions[1],
    adminId: userRows[2].id,
    adminSessionId: sessions[2],
    productId: productRows[0].id,
  };
}

function authHeaders(user) {
  return {
    Authorization: `Bearer ${generateAccessToken(user, user.sessionId)}`,
    'Content-Type': 'application/json',
  };
}

test('rotas garantem permissões de cliente e administrador', async () => {
  const context = await resetDb();
  await cartService.addItem(context.customerId, {
    productId: context.productId,
    quantity: 1,
  });
  const created = await orderService.checkout(context.customerId, {
    deliveryMethod: 'store_pickup',
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/api`;
  const customer = { id: context.customerId, role: 'customer', sessionId: context.customerSessionId };
  const otherCustomer = { id: context.otherCustomerId, role: 'customer', sessionId: context.otherCustomerSessionId };
  const admin = { id: context.adminId, role: 'admin', sessionId: context.adminSessionId };

  try {
    let response = await fetch(`${base}/admin/orders`, {
      headers: authHeaders(customer),
    });
    assert.equal(response.status, 403);

    response = await fetch(`${base}/admin/orders`, {
      headers: authHeaders(admin),
    });
    assert.equal(response.status, 200);
    const list = await response.json();
    assert.equal(list.data.items[0].id, created.id);

    response = await fetch(`${base}/admin/orders/${created.id}/accept`, {
      method: 'POST',
      headers: authHeaders(otherCustomer),
    });
    assert.equal(response.status, 403);

    response = await fetch(`${base}/admin/orders/${created.id}/accept`, {
      method: 'POST',
      headers: authHeaders(admin),
    });
    assert.equal(response.status, 200);
    const accepted = await response.json();
    assert.equal(accepted.data.status, 'accepted');

    response = await fetch(`${base}/admin/notifications`, {
      headers: authHeaders(admin),
    });
    assert.equal(response.status, 200);

    response = await fetch(`${base}/admin/notifications`, {
      method: 'POST',
      headers: authHeaders(customer),
      body: JSON.stringify({
        title: 'Promoção de teste',
        message: 'Notificação publicada para clientes.',
        type: 'promotion',
        status: 'published',
        recipient_scope: 'all_customers',
      }),
    });
    assert.equal(response.status, 403);

    response = await fetch(`${base}/admin/notifications`, {
      method: 'POST',
      headers: authHeaders(admin),
      body: JSON.stringify({
        title: 'Promoção de teste',
        message: 'Notificação publicada para clientes.',
        type: 'promotion',
        status: 'published',
        recipient_scope: 'all_customers',
      }),
    });
    assert.equal(response.status, 201);

    response = await fetch(`${base}/orders/${created.id}`, {
      headers: authHeaders(otherCustomer),
    });
    assert.equal(response.status, 403);
    response = await fetch(`${base}/orders/${created.id}`, {
      headers: authHeaders(customer),
    });
    assert.equal(response.status, 200, 'o proprietário consegue consultar o seu pedido');

    response = await fetch(`${base}/notifications`, {
      headers: authHeaders(customer),
    });
    assert.equal(response.status, 200);
    const notifications = await response.json();
    assert.ok(notifications.data.items.some((item) => item.order_id === created.id));
    assert.ok(notifications.data.items.some((item) => item.title === 'Promoção de teste'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
