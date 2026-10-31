const { pool, query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');
const cartService = require('../cart/cart.service');
const notificationsService = require('../notifications/notifications.service');
const { isTransitionAllowed, statusNotification } = require('./order.status');

function normalizeMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function mapAddress(row) {
  if (!row.address_id) return null;
  return {
    id: row.address_id,
    label: row.label,
    province: row.province,
    city: row.city,
    neighborhood: row.neighborhood,
    street: row.street,
    number: row.number,
    reference: row.reference,
    geoLat: row.geo_lat,
    geoLng: row.geo_lng,
    isDefault: row.is_default,
  };
}

function mapPaymentMethod(row) {
  if (!row.payment_method_id) return null;
  return {
    id: row.payment_method_id,
    type: row.payment_type,
    label: row.payment_label,
    provider: row.payment_provider,
    cardBrand: row.card_brand,
    cardLast4: row.card_last4,
    phone: row.payment_phone,
  };
}

function mapItems(rows) {
  return rows.map((row) => ({
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
  }));
}

function mapOrder(row, items = []) {
  const order = {
    id: Number(row.id),
    userId: Number(row.user_id),
    status: row.status,
    paymentStatus: row.payment_status,
    deliveryMethod: row.delivery_method,
    total: normalizeMoney(row.total),
    subtotal: normalizeMoney(row.subtotal),
    discount: normalizeMoney(row.discount),
    deliveryFee: normalizeMoney(row.delivery_fee),
    couponCode: row.coupon_code,
    notes: row.notes,
    rejectionReason: row.rejection_reason,
    acceptedAt: row.accepted_at,
    rejectedAt: row.rejected_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    address: mapAddress(row),
    paymentMethod: mapPaymentMethod(row),
    items: mapItems(items),
  };

  if (row.full_name !== undefined) {
    order.customer = {
      id: Number(row.user_id),
      name: row.full_name,
      email: row.email,
      phone: row.phone,
      avatarUrl: row.avatar_url,
    };
  }

  return order;
}

const ORDER_SELECT = `
  SELECT o.id, o.user_id, o.address_id, o.status, o.total, o.subtotal, o.discount,
         o.delivery_fee, o.coupon_code, o.notes, o.payment_method_id,
         o.delivery_method, o.payment_status, o.rejection_reason,
         o.accepted_at, o.rejected_at, o.completed_at, o.cancelled_at,
         o.created_at, o.updated_at,
         a.label, a.province, a.city, a.neighborhood, a.street, a."number",
         a.reference, a.geo_lat, a.geo_lng, a.is_default,
         pm.type AS payment_type, pm.label AS payment_label,
         pm.provider AS payment_provider, pm.card_brand, pm.card_last4,
         pm.phone AS payment_phone
  FROM orders o
  LEFT JOIN addresses a ON a.id = o.address_id
  LEFT JOIN payment_methods pm ON pm.id = o.payment_method_id
`;

const ADMIN_ORDER_SELECT = `
  SELECT o.id, o.user_id, o.address_id, o.status, o.total, o.subtotal, o.discount,
         o.delivery_fee, o.coupon_code, o.notes, o.payment_method_id,
         o.delivery_method, o.payment_status, o.rejection_reason,
         o.accepted_at, o.rejected_at, o.completed_at, o.cancelled_at,
         o.created_at, o.updated_at,
         a.label, a.province, a.city, a.neighborhood, a.street, a."number",
         a.reference, a.geo_lat, a.geo_lng, a.is_default,
         pm.type AS payment_type, pm.label AS payment_label,
         pm.provider AS payment_provider, pm.card_brand, pm.card_last4,
         pm.phone AS payment_phone,
         u.full_name, u.email, u.phone, u.avatar_url
  FROM orders o
  JOIN users u ON u.id = o.user_id
  LEFT JOIN addresses a ON a.id = o.address_id
  LEFT JOIN payment_methods pm ON pm.id = o.payment_method_id
`;

async function loadItems(orderIds, runner = { query }) {
  if (orderIds.length === 0) return new Map();
  const { rows } = await runner.query(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.unit_price,
            (oi.quantity * oi.unit_price) AS subtotal,
            p.name, p.image_url
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ANY($1::int[])
     ORDER BY oi.id ASC`,
    [orderIds]
  );
  const grouped = new Map();
  for (const row of rows) {
    const list = grouped.get(Number(row.order_id)) || [];
    list.push(row);
    grouped.set(Number(row.order_id), list);
  }
  return grouped;
}

async function getOrderById(userId, orderId) {
  const { rows } = await query(`${ORDER_SELECT} WHERE o.id = $1`, [orderId]);

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
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`,
    [orderId]
  );

  return mapOrder(rows[0], itemsRows);
}

async function listOrdersForUser(userId) {
  const { rows } = await query(
    `SELECT o.id, o.user_id, o.address_id, o.status, o.total, o.subtotal, o.discount,
            o.delivery_fee, o.coupon_code, o.notes, o.payment_method_id,
            o.delivery_method, o.payment_status, o.rejection_reason,
            o.accepted_at, o.rejected_at, o.completed_at, o.cancelled_at,
            o.created_at, o.updated_at,
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
            a.label, a.province, a.city, a.neighborhood, a.street, a."number",
            a.reference, a.geo_lat, a.geo_lng, a.is_default,
            pm.type AS payment_type, pm.label AS payment_label,
            pm.provider AS payment_provider, pm.card_brand, pm.card_last4,
            pm.phone AS payment_phone
     FROM orders o
     LEFT JOIN addresses a ON a.id = o.address_id
     LEFT JOIN payment_methods pm ON pm.id = o.payment_method_id
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC, o.id DESC`,
    [userId]
  );

  const itemsByOrder = await loadItems(rows.map((row) => Number(row.id)));
  return rows.map((row) => ({
    ...mapOrder(row, itemsByOrder.get(Number(row.id)) || []),
    itemCount: Number(row.item_count),
  }));
}

async function getOrderForAdmin(orderId) {
  const { rows } = await query(`${ADMIN_ORDER_SELECT} WHERE o.id = $1`, [orderId]);
  if (!rows[0]) throw new ApiError(404, 'Pedido não encontrado.');

  const itemsByOrder = await loadItems([orderId]);
  return mapOrder(rows[0], itemsByOrder.get(Number(orderId)) || []);
}

async function listOrdersForAdmin({ status, search, from, to, page = 1, limit = 50 } = {}) {
  const where = [];
  const params = [];

  if (status) {
    params.push(status);
    where.push(`o.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(
      u.full_name ILIKE $${params.length}
      OR u.phone ILIKE $${params.length}
      OR u.email ILIKE $${params.length}
      OR CAST(o.id AS TEXT) ILIKE $${params.length}
    )`);
  }
  if (from) {
    params.push(from);
    where.push(`o.created_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    where.push(`o.created_at < ($${params.length}::date + interval '1 day')`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countParams = [...params];
  params.push(limit, (page - 1) * limit);

  const [countResult, listResult] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total
       FROM orders o JOIN users u ON u.id = o.user_id
       ${whereSql}`,
      countParams
    ),
    query(
      `${ADMIN_ORDER_SELECT}
       ${whereSql}
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
  ]);

  const itemsByOrder = await loadItems(listResult.rows.map((row) => Number(row.id)));
  const total = countResult.rows[0]?.total ?? 0;

  return {
    items: listResult.rows.map((row) => {
      const order = mapOrder(row, itemsByOrder.get(Number(row.id)) || []);
      order.itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      return order;
    }),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function restoreOrderStock(client, orderId) {
  const { rows } = await client.query(
    'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
    [orderId]
  );
  for (const item of rows) {
    await client.query(
      'UPDATE products SET stock = stock + $1, updated_at = now() WHERE id = $2',
      [Number(item.quantity), item.product_id]
    );
  }
}

async function transitionOrder(adminId, orderId, nextStatus, reason = null) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, user_id, status, delivery_method, payment_status
       FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );
    const order = rows[0];
    if (!order) throw new ApiError(404, 'Pedido não encontrado.');

    // Repetir o mesmo pedido de estado é idempotente: não cria notificação.
    if (order.status === nextStatus) {
      await client.query('COMMIT');
      return getOrderForAdmin(orderId);
    }

    if (!isTransitionAllowed(order.status, nextStatus, order.delivery_method)) {
      throw new ApiError(
        409,
        `Transição inválida de "${order.status}" para "${nextStatus}".`,
        'INVALID_ORDER_TRANSITION'
      );
    }

    if (nextStatus === 'accepted' && order.payment_status !== 'paid') {
      throw new ApiError(
        409,
        'O pedido só pode ser aceite depois de o pagamento estar aprovado.',
        'PAYMENT_NOT_CONFIRMED'
      );
    }

    const assignments = ['status = $1', 'updated_at = now()'];
    const values = [nextStatus];

    if (nextStatus === 'accepted') assignments.push('accepted_at = now()');
    if (nextStatus === 'rejected') {
      assignments.push('rejected_at = now()');
      values.push(reason);
      assignments.push(`rejection_reason = $${values.length}`);
    }
    if (nextStatus === 'completed') assignments.push('completed_at = now()');
    if (nextStatus === 'cancelled') assignments.push('cancelled_at = now()');

    values.push(orderId);
    await client.query(
      `UPDATE orders SET ${assignments.join(', ')} WHERE id = $${values.length}`,
      values
    );

    if (nextStatus === 'rejected' || nextStatus === 'cancelled') {
      await restoreOrderStock(client, orderId);
    }

    const notification = statusNotification(orderId, nextStatus, reason);
    if (notification) {
      await notificationsService.createOrderNotificationInTransaction(client, {
        userId: Number(order.user_id),
        title: notification.title,
        message: notification.message,
        orderId,
        idempotencyKey: `order:${orderId}:status:${nextStatus}`,
        createdBy: adminId,
      });
    }

    await client.query('COMMIT');
    return getOrderForAdmin(orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function acceptOrder(adminId, orderId) {
  return transitionOrder(adminId, orderId, 'accepted');
}

async function rejectOrder(adminId, orderId, reason) {
  return transitionOrder(adminId, orderId, 'rejected', reason);
}

async function updateOrderStatus(adminId, orderId, status) {
  return transitionOrder(adminId, orderId, status);
}

async function checkout(userId, payload = {}) {
  const { deliveryAddressId, couponCode, notes, paymentMethodId } = payload;
  const cart = await cartService.getCart(userId);

  if (!cart.items || cart.items.length === 0) {
    throw new ApiError(400, 'Carrinho vazio.', 'CART_EMPTY');
  }

  const deliveryMethod = payload.deliveryMethod ||
    (deliveryAddressId ? 'home_delivery' : 'store_pickup');

  if (deliveryMethod === 'home_delivery' && !deliveryAddressId) {
    throw new ApiError(400, 'Seleciona o endereço de entrega.', 'ADDRESS_REQUIRED');
  }
  if (deliveryMethod === 'store_pickup' && deliveryAddressId) {
    throw new ApiError(400, 'Levantamento na loja não deve incluir endereço de entrega.', 'INVALID_DELIVERY');
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

    if (paymentMethodId) {
      const paymentMethod = await client.query(
        'SELECT id FROM payment_methods WHERE id = $1 AND user_id = $2',
        [paymentMethodId, userId]
      );
      if (!paymentMethod.rows[0]) {
        throw new ApiError(404, 'Método de pagamento não encontrado.', 'PAYMENT_METHOD_NOT_FOUND');
      }
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
    if (deliveryMethod === 'home_delivery') {
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
      `INSERT INTO orders
         (user_id, address_id, status, total, subtotal, discount, delivery_fee,
          coupon_code, notes, payment_method_id, delivery_method, payment_status,
          created_at, updated_at)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, 'paid', now(), now())
       RETURNING id, user_id, address_id, status, total, subtotal, discount,
                 delivery_fee, coupon_code, notes, payment_method_id,
                 delivery_method, payment_status, rejection_reason,
                 accepted_at, rejected_at, completed_at, cancelled_at,
                 created_at, updated_at`,
      [
        userId,
        deliveryMethod === 'home_delivery' ? deliveryAddressId : null,
        total,
        subtotal,
        discount,
        deliveryFee,
        normalizedCoupon,
        notes || null,
        paymentMethodId || null,
        deliveryMethod,
      ]
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
      paymentStatus: order.payment_status,
      deliveryMethod: order.delivery_method,
      subtotal: normalizeMoney(order.subtotal),
      discount: normalizeMoney(order.discount),
      deliveryFee: normalizeMoney(order.delivery_fee),
      total: normalizeMoney(order.total),
      deliveryAddressId: order.address_id,
      paymentMethodId: order.payment_method_id,
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

module.exports = {
  checkout,
  getOrderById,
  listOrdersForUser,
  getOrderForAdmin,
  listOrdersForAdmin,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
};
