const test = require('node:test');
const assert = require('node:assert/strict');

const { query } = require('../src/config/db');
const cartService = require('../src/modules/cart/cart.service');
const orderService = require('../src/modules/orders/order.service');

async function resetDb() {
  await query('DELETE FROM cart_items');
  await query('DELETE FROM carts');
  await query('DELETE FROM order_items');
  await query('DELETE FROM orders');
  await query('DELETE FROM products');
  await query('DELETE FROM categories');
  await query('DELETE FROM users');

  const { rows: categoryRows } = await query(
    `INSERT INTO categories (name, slug) VALUES ('Test Category', 'test-category') RETURNING id`
  );

  const { rows: userRows } = await query(
    `INSERT INTO users (full_name, phone, email, password_hash, role)
     VALUES ('Cart User', '+351900000001', 'cart.user@example.com', 'unused', 'customer')
     RETURNING id`
  );

  const categoryId = categoryRows[0].id;
  const userId = userRows[0].id;

  const { rows: productRows } = await query(
    `INSERT INTO products (name, description, price, stock, image_url, category_id, rating, is_popular, is_new_arrival)
     VALUES ('Test Product', 'Example product', 1500, 5, 'https://example.com/product.png', $1, 5, true, true)
     RETURNING id, price, stock`,
    [categoryId]
  );

  return { userId, productId: productRows[0].id, price: Number(productRows[0].price) };
}

test('cart adds item and increments quantity for the same product', async () => {
  const { userId, productId } = await resetDb();

  const first = await cartService.addItem(userId, { productId, quantity: 1 });
  const second = await cartService.addItem(userId, { productId, quantity: 2 });

  assert.equal(first.items.length, 1);
  assert.equal(second.items[0].quantity, 3);
  assert.equal(second.items[0].unitPrice, 1500);
  assert.equal(second.subtotal, 4500);
});

test('checkout creates order, reduces stock and clears cart', async () => {
  const { userId, productId } = await resetDb();

  await cartService.addItem(userId, { productId, quantity: 2 });

  const order = await orderService.checkout(userId, { deliveryAddressId: null, couponCode: null, notes: 'Entrega no portão' });

  assert.equal(order.items.length, 1);
  assert.equal(order.total, 3000);
  assert.equal(order.status, 'pending');

  const { rows } = await query('SELECT stock FROM products WHERE id = $1', [productId]);
  assert.equal(Number(rows[0].stock), 3);

  const cart = await cartService.getCart(userId);
  assert.equal(cart.items.length, 0);
});

test('checkout rejects insufficient stock', async () => {
  const { userId, productId } = await resetDb();

  await cartService.addItem(userId, { productId, quantity: 1 });
  await query('UPDATE products SET stock = 0 WHERE id = $1', [productId]);

  await assert.rejects(
    () => orderService.checkout(userId, { deliveryAddressId: null, couponCode: null, notes: null }),
    (err) => {
      assert.equal(err.code, 'INSUFFICIENT_STOCK');
      return true;
    }
  );
});
