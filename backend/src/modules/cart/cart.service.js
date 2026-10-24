const { query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');
const productService = require('../products/product.service');

function normalizeMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function buildCartSummary(items) {
  const subtotal = normalizeMoney(items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0));
  const discount = 0;
  const deliveryFee = 0;
  const total = normalizeMoney(Math.max(0, subtotal - discount + deliveryFee));

  return {
    subtotal,
    discount,
    deliveryFee,
    total,
  };
}

async function ensureCart(userId) {
  const { rows } = await query(
    `SELECT id, user_id, created_at, updated_at
     FROM carts
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  if (rows[0]) return rows[0];

  const created = await query(
    `INSERT INTO carts (user_id) VALUES ($1) RETURNING id, user_id, created_at, updated_at`,
    [userId]
  );

  return created.rows[0];
}

async function getCart(userId) {
  const cart = await ensureCart(userId);

  const { rows: items } = await query(
    `SELECT ci.id, ci.product_id, ci.quantity, ci.unit_price,
            (ci.quantity * ci.unit_price) AS subtotal,
            p.id AS product_id_fk, p.name, p.price AS product_price, p.stock, p.image_url
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1
     ORDER BY ci.id ASC`,
    [cart.id]
  );

  const normalizedItems = items.map((row) => ({
    id: row.id,
    productId: row.product_id,
    quantity: Number(row.quantity),
    unitPrice: normalizeMoney(row.unit_price),
    subtotal: normalizeMoney(row.subtotal),
    product: {
      id: row.product_id_fk,
      name: row.name,
      price: normalizeMoney(row.product_price),
      stock: Number(row.stock),
      image: row.image_url,
    },
  }));

  const totals = buildCartSummary(normalizedItems);

  return {
    id: cart.id,
    items: normalizedItems,
    updatedAt: cart.updated_at,
    ...totals,
  };
}

async function addItem(userId, payload) {
  const { productId, quantity } = payload;
  const product = await productService.getById(productId);

  if (!product || Number(product.stock) < 0) {
    throw new ApiError(404, 'Produto não encontrado.');
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ApiError(400, 'quantity inválida.', 'INVALID_QUANTITY');
  }

  if (Number(product.stock) < quantity) {
    throw new ApiError(409, 'Stock insuficiente para este produto.', 'INSUFFICIENT_STOCK');
  }

  const cart = await ensureCart(userId);

  const existing = await query(
    `SELECT id, quantity, unit_price FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
    [cart.id, productId]
  );

  if (existing.rows[0]) {
    const currentQty = Number(existing.rows[0].quantity);
    const newQty = currentQty + quantity;

    if (Number(product.stock) < newQty) {
      throw new ApiError(409, 'Stock insuficiente para este produto.', 'INSUFFICIENT_STOCK');
    }

    const updated = await query(
      `UPDATE cart_items
       SET quantity = $1, unit_price = $2, updated_at = now()
       WHERE id = $3
       RETURNING id, cart_id, product_id, quantity, unit_price, created_at, updated_at`,
      [newQty, Number(product.price), existing.rows[0].id]
    );

    return getCart(userId, updated.rows[0]);
  }

  const inserted = await query(
    `INSERT INTO cart_items (cart_id, product_id, quantity, unit_price)
     VALUES ($1, $2, $3, $4)
     RETURNING id, cart_id, product_id, quantity, unit_price, created_at, updated_at`,
    [cart.id, productId, quantity, Number(product.price)]
  );

  return getCart(userId, inserted.rows[0]);
}

async function updateItem(userId, itemId, payload) {
  const { quantity } = payload;
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new ApiError(400, 'quantity inválida.', 'INVALID_QUANTITY');
  }

  const item = await query(
    `SELECT ci.id, ci.cart_id, ci.product_id, ci.quantity, ci.unit_price,
            c.user_id, p.stock, p.price, p.name, p.image_url
     FROM cart_items ci
     JOIN carts c ON c.id = ci.cart_id
     JOIN products p ON p.id = ci.product_id
     WHERE ci.id = $1`,
    [itemId]
  );

  if (!item.rows[0]) {
    throw new ApiError(404, 'Item do carrinho não encontrado.');
  }

  if (Number(item.rows[0].user_id) !== Number(userId)) {
    throw new ApiError(403, 'Este item não pertence ao seu carrinho.');
  }

  if (quantity === 0) {
    await query('DELETE FROM cart_items WHERE id = $1', [itemId]);
    return getCart(userId);
  }

  if (Number(item.rows[0].stock) < quantity) {
    throw new ApiError(409, 'Stock insuficiente para este produto.', 'INSUFFICIENT_STOCK');
  }

  const updated = await query(
    `UPDATE cart_items
     SET quantity = $1, unit_price = $2, updated_at = now()
     WHERE id = $3
     RETURNING id, cart_id, product_id, quantity, unit_price`,
    [quantity, Number(item.rows[0].price), itemId]
  );

  return getCart(userId);
}

async function removeItem(userId, itemId) {
  const item = await query(
    `SELECT ci.id, c.user_id
     FROM cart_items ci
     JOIN carts c ON c.id = ci.cart_id
     WHERE ci.id = $1`,
    [itemId]
  );

  if (!item.rows[0]) {
    throw new ApiError(404, 'Item do carrinho não encontrado.');
  }

  if (Number(item.rows[0].user_id) !== Number(userId)) {
    throw new ApiError(403, 'Este item não pertence ao seu carrinho.');
  }

  await query('DELETE FROM cart_items WHERE id = $1', [itemId]);
  return getCart(userId);
}

async function clearCart(userId) {
  const cart = await ensureCart(userId);
  await query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
  return getCart(userId);
}

module.exports = {
  getCart,
  ensureCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};
