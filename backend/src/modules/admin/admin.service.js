const { query } = require('../../config/db');

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

async function getDashboard(requestedPeriod = '30d') {
  const period = VALID_PERIODS.has(requestedPeriod) ? requestedPeriod : '30d';
  const days = Number.parseInt(period, 10);
  const interval = `${days} days`;

  const [metrics, revenue, orders, stock] = await Promise.all([
    query(
      `SELECT
         COALESCE((SELECT SUM(total) FROM orders
           WHERE status <> 'cancelled' AND created_at >= now() - $1::interval), 0) AS revenue,
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
              COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled'), 0) AS value
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

module.exports = { getDashboard, getCustomers };
