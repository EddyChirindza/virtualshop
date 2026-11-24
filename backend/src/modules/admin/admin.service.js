const { pool, query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');

const LOW_STOCK_LIMIT = 5;
const VALID_PERIODS = new Set(['7d', '30d', '90d']);

async function getCustomers() {
  const { rows } = await query(
    `SELECT id, full_name AS "fullName", email, phone, avatar_url AS "avatarUrl", created_at AS "createdAt"
     FROM users
     WHERE role = 'customer'
     ORDER BY created_at DESC, id DESC`
  );

  return rows.map((customer) => ({
    id: Number(customer.id),
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    avatarUrl: customer.avatarUrl,
    createdAt: customer.createdAt,
  }));
}

async function getProductReviewReport({ page = 1, limit = 50, rating, productId, q = '' } = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  if (rating !== undefined) {
    params.push(rating);
    conditions.push(`r.rating = $${params.length}`);
  }
  if (productId !== undefined) {
    params.push(productId);
    conditions.push(`r.product_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`(COALESCE(r.comment, '') ILIKE $${params.length} ESCAPE '\\' OR u.full_name ILIKE $${params.length} ESCAPE '\\' OR p.name ILIKE $${params.length} ESCAPE '\\')`);
  }
  const filteredWhere = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const reviewParams = [...params];
  reviewParams.push(limit, offset);
  const limitParam = `$${reviewParams.length - 1}`;
  const offsetParam = `$${reviewParams.length}`;
  const [summaryResult, productsResult, filteredCountResult, reviewsResult] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average,
              COUNT(*) FILTER (WHERE rating = 5)::int AS five_stars,
              COUNT(*) FILTER (WHERE rating = 4)::int AS four_stars,
              COUNT(*) FILTER (WHERE rating = 3)::int AS three_stars,
              COUNT(*) FILTER (WHERE rating = 2)::int AS two_stars,
              COUNT(*) FILTER (WHERE rating = 1)::int AS one_star
       FROM product_reviews`
    ),
    query(
      `SELECT p.id, p.name, p.image_url,
              COUNT(r.id)::int AS review_count,
              ROUND(AVG(r.rating)::numeric, 1) AS average_rating
       FROM products p
       JOIN product_reviews r ON r.product_id = p.id
       GROUP BY p.id
       ORDER BY review_count DESC, average_rating DESC, p.name ASC`
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM product_reviews r
       JOIN products p ON p.id = r.product_id
       JOIN users u ON u.id = r.user_id
       ${filteredWhere}`,
      params
    ),
    query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              p.id AS product_id, p.name AS product_name, p.image_url AS product_image_url,
              u.id AS user_id, u.full_name AS customer_name
       FROM product_reviews r
       JOIN products p ON p.id = r.product_id
       JOIN users u ON u.id = r.user_id
       ${filteredWhere}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      reviewParams
    ),
  ]);
  const summary = summaryResult.rows[0];
  const total = Number(filteredCountResult.rows[0].total);

  return {
    summary: {
      total,
      average: Number(summary.average),
      distribution: [
        { rating: 5, count: Number(summary.five_stars) },
        { rating: 4, count: Number(summary.four_stars) },
        { rating: 3, count: Number(summary.three_stars) },
        { rating: 2, count: Number(summary.two_stars) },
        { rating: 1, count: Number(summary.one_star) },
      ],
      reviewedProducts: productsResult.rows.length,
    },
    products: productsResult.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      image_url: row.image_url,
      reviewCount: Number(row.review_count),
      averageRating: Number(row.average_rating),
    })),
    reviews: reviewsResult.rows.map((row) => ({
      id: Number(row.id),
      rating: Number(row.rating),
      comment: row.comment,
      createdAt: row.created_at,
      product: {
        id: Number(row.product_id),
        name: row.product_name,
        image_url: row.product_image_url,
      },
      customer: {
        id: Number(row.user_id),
        name: row.customer_name,
      },
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getDashboard(requestedPeriod = '30d') {
  const period = VALID_PERIODS.has(requestedPeriod) ? requestedPeriod : '30d';
  const days = Number.parseInt(period, 10);
  const interval = `${days} days`;

  const [metrics, revenue, orders, stock] = await Promise.all([
    query(
      `SELECT
         COALESCE((SELECT SUM(total) FROM orders
           WHERE status NOT IN ('cancelled', 'rejected') AND created_at >= now() - $1::interval), 0) AS revenue,
         (SELECT COUNT(*) FROM orders
           WHERE created_at >= now() - $1::interval) AS order_count,
         (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders,
         (SELECT COUNT(*) FROM products WHERE stock <= $2) AS low_stock_count,
         (SELECT COUNT(*) FROM users WHERE role = 'customer' AND is_active = true) AS customer_count,
         (SELECT COUNT(*) FROM products) AS product_count`,
      [interval, LOW_STOCK_LIMIT]
    ),
    query(
      `SELECT to_char(days.day, 'DD/MM') AS label,
              COALESCE(SUM(o.total) FILTER (WHERE o.status NOT IN ('cancelled', 'rejected')), 0) AS value
       FROM generate_series(
         date_trunc('day', now()) - (($1::int - 1) * interval '1 day'),
         date_trunc('day', now()), interval '1 day'
       ) AS days(day)
       LEFT JOIN orders o ON date_trunc('day', o.created_at) = days.day
       GROUP BY days.day ORDER BY days.day`,
      [days]
    ),
    query(
      `SELECT o.id, u.full_name AS customer, o.status, o.total, o.created_at AS "createdAt"
       FROM orders o JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC LIMIT 6`
    ),
    query(
      `SELECT id, name, stock,
              CASE WHEN stock = 0 THEN 'out_of_stock' WHEN stock <= 5 THEN 'low_stock' ELSE 'in_stock' END AS stock_status
       FROM products WHERE stock <= $1
       ORDER BY stock ASC, name ASC LIMIT 6`,
      [LOW_STOCK_LIMIT]
    ),
  ]);

  const summary = metrics.rows[0];
  return {
    period,
    metrics: {
      revenue: Number(summary.revenue),
      orders: Number(summary.order_count),
      pendingOrders: Number(summary.pending_orders),
      lowStockProducts: Number(summary.low_stock_count),
      customers: Number(summary.customer_count),
      products: Number(summary.product_count),
    },
    revenueSeries: revenue.rows.map((row) => ({ label: row.label, value: Number(row.value) })),
    recentOrders: orders.rows.map((row) => ({
      id: Number(row.id), customer: row.customer, status: row.status,
      total: Number(row.total), createdAt: row.createdAt,
    })),
    lowStockProducts: stock.rows.map((row) => ({
      id: Number(row.id), name: row.name, stock_status: row.stock_status,
    })),
  };
}


async function getCustomerDetails(id) {
  const { ApiError } = require('../../middlewares/error.middleware');
  const customerId = Number(id);
  if (!Number.isSafeInteger(customerId) || customerId <= 0) {
    throw new ApiError(400, 'Id de cliente inválido.');
  }

  const { rows } = await query(
    `SELECT u.id,
            u.full_name AS "fullName",
            u.email,
            u.phone,
            u.avatar_url AS "avatarUrl",
            u.created_at AS "createdAt",
            COALESCE(stats.order_count, 0) AS "orderCount",
            COALESCE(stats.total_spent, 0) AS "totalSpent",
            stats.last_order_at AS "lastOrderAt"
     FROM users u
     LEFT JOIN (
       SELECT user_id,
              COUNT(*)::int AS order_count,
              COALESCE(SUM(total) FILTER (WHERE status NOT IN ('cancelled','rejected')), 0) AS total_spent,
              MAX(created_at) AS last_order_at
       FROM orders
       GROUP BY user_id
     ) stats ON stats.user_id = u.id
     WHERE u.id = $1 AND u.role = 'customer'`,
    [customerId]
  );
  const customer = rows[0];
  if (!customer) throw new ApiError(404, 'Cliente não encontrado.');

  const ordersRes = await query(
    `SELECT o.id, o.status, o.payment_status AS "paymentStatus",
            o.delivery_method AS "deliveryMethod",
            o.total, o.created_at AS "createdAt",
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS "itemCount"
     FROM orders o
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT 50`,
    [customerId]
  );

  return {
    id: Number(customer.id),
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    avatarUrl: customer.avatarUrl,
    createdAt: customer.createdAt,
    stats: {
      orderCount: Number(customer.orderCount),
      totalSpent: Number(customer.totalSpent),
      lastOrderAt: customer.lastOrderAt,
    },
    orders: ordersRes.rows.map((row) => ({
      id: Number(row.id),
      status: row.status,
      paymentStatus: row.paymentStatus,
      deliveryMethod: row.deliveryMethod,
      total: Number(row.total),
      itemCount: Number(row.itemCount),
      createdAt: row.createdAt,
    })),
  };
}

async function deleteProductReview(reviewId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const review = await client.query(
      'SELECT id, product_id FROM product_reviews WHERE id = $1 FOR UPDATE',
      [reviewId]
    );
    if (!review.rows[0]) throw new ApiError(404, 'Avaliação não encontrada.');

    await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [review.rows[0].product_id]);
    await client.query('DELETE FROM product_reviews WHERE id = $1', [reviewId]);
    await client.query(
      `UPDATE products
       SET rating = (SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) FROM product_reviews r WHERE r.product_id = $1),
           updated_at = now()
       WHERE id = $1`,
      [review.rows[0].product_id]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getProductReviewReport({ page: 1, limit: 50 });
}

module.exports = { getDashboard, getCustomers, getCustomerDetails, getProductReviewReport, deleteProductReview };
