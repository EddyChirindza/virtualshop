const { pool, query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');
const cartService = require('../cart/cart.service');

function normalizeMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function getOrderById(userId, orderId) {
  const { rows } = await query(
    `SELECT o.id, o.user_id, o.address_id, o.status, o.total, o.created_at, o.updated_at,
            a.label, a.street, a.city, a.geo_lat, a.geo_lng, a.is_default
     FROM orders o
     LEFT JOIN addresses a ON a.id = o.address_id
     WHERE o.id = $1`,
    [orderId]
  );

  if (!rows[0]) {
    throw new ApiError(404, 'Pedido não encontrado.');
  }

  if (Number(rows[0].user_id) !== Number(userId)) {
    throw new ApiError(403, 'Você não tem acesso a este pedido.');
  }

  const { rows: itemsRows } = await query(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.unit_price,
            (oi.quantity * oi.unit_price) AS subtotal,
            p.name, p.image_url
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );

  return {
    id: rows[0].id,
    userId: rows[0].user_id,
    status: rows[0].status,
    total: normalizeMoney(rows[0].total),
    createdAt: rows[0].created_at,
    updatedAt: rows[0].updated_at,
    address: rows[0].address_id ? {
      id: rows[0].address_id,
      label: rows[0].label,
      street: rows[0].street,
      city: rows[0].city,
      geoLat: rows[0].geo_lat,
      geoLng: rows[0].geo_lng,
      isDefault: rows[0].is_default,
    } : null,
    items: itemsRows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      quantity: Number(row.quantity),
      unitPrice: normalizeMoney(row.unit_price),
      subtotal: normalizeMoney(row.subtotal),
      product: {
        id: row.product_id,
        name: row.name,
        image: row.image_url,
      },
    })),
  };
}

async function checkout(userId, payload = {}) {
  const { deliveryAddressId, couponCode, notes } = payload;
  const cart = await cartService.getCart(userId);

  if (!cart.items || cart.items.length === 0) {
    throw new ApiError(400, 'Carrinho vazio.', 'CART_EMPTY');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cartRecord = await client.query(
      `SELECT id FROM carts WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (!cartRecord.rows[0]) {
      throw new ApiError(404, 'Carrinho não encontrado.', 'CART_NOT_FOUND');
    }

    const cartItems = await client.query(
      `SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.stock
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1 ORDER BY ci.id ASC`,
      [cartRecord.rows[0].id]
    );

    if (cartItems.rows.length === 0) {
      throw new ApiError(400, 'Carrinho vazio.', 'CART_EMPTY');
    }

    let subtotal = 0;
    for (const item of cartItems.rows) {
      if (Number(item.stock) < Number(item.quantity)) {
        throw new ApiError(409, `Stock insuficiente para o produto ${item.name}.`, 'INSUFFICIENT_STOCK');
      }
      subtotal += Number(item.price) * Number(item.quantity);
    }

    let discount = 0;
    const normalizedCoupon = couponCode && String(couponCode).trim() ? String(couponCode).trim().toUpperCase() : null;
    if (normalizedCoupon) {
      if (normalizedCoupon === 'PROMO10') {
        discount = Number((subtotal * 0.10).toFixed(2));
      } else {
        throw new ApiError(400, 'Cupão inválido.');
      }
    }

    let deliveryFee = 0;
    if (deliveryAddressId) {
      const address = await client.query(
        'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
        [deliveryAddressId, userId]
      );
      if (!address.rows[0]) {
        throw new ApiError(404, 'Endereço de entrega não encontrado.', 'ADDRESS_NOT_FOUND');
      }
      deliveryFee = 50;
    }

    const total = normalizeMoney(Math.max(0, subtotal - discount + deliveryFee));
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, address_id, status, total, subtotal, discount, delivery_fee, coupon_code, notes, created_at, updated_at)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, now(), now())
       RETURNING id, user_id, address_id, status, total, subtotal, discount, delivery_fee, coupon_code, notes, created_at, updated_at`,
      [userId, deliveryAddressId || null, total, subtotal, discount, deliveryFee, normalizedCoupon, notes || null]
    );

    const order = orderResult.rows[0];

    for (const item of cartItems.rows) {
      const unitPrice = Number(item.price);
      const quantity = Number(item.quantity);
      const itemSubtotal = normalizeMoney(unitPrice * quantity);

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.product_id, quantity, unitPrice, itemSubtotal]
      );

      const updateStock = await client.query(
        `UPDATE products
         SET stock = stock - $1, updated_at = now()
         WHERE id = $2 AND stock >= $1`,
        [quantity, item.product_id]
      );

      if (updateStock.rowCount !== 1) {
        throw new ApiError(409, `Stock insuficiente para o produto ${item.name}.`, 'INSUFFICIENT_STOCK');
      }
    }

    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartRecord.rows[0].id]);
    await client.query('COMMIT');

    return {
      id: order.id,
      userId: order.user_id,
      status: order.status,
      subtotal: normalizeMoney(order.subtotal),
      discount: normalizeMoney(order.discount),
      deliveryFee: normalizeMoney(order.delivery_fee),
      total: normalizeMoney(order.total),
      deliveryAddressId: order.address_id,
      couponCode: order.coupon_code,
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: cartItems.rows.map((item) => ({
        productId: item.product_id,
        quantity: Number(item.quantity),
        unitPrice: normalizeMoney(item.price),
        subtotal: normalizeMoney(Number(item.price) * Number(item.quantity)),
      })),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { checkout, getOrderById };
