const { query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');

const VISIBLE_WHERE = `n.status = 'published'
  AND n.published_at <= now()
  AND (n.starts_at IS NULL OR n.starts_at <= now())
  AND (n.expires_at IS NULL OR n.expires_at > now())
  AND (n.recipient_scope = 'all_customers' OR n.recipient_user_id = $1)`;

async function listForUser(userId, { page = 1, limit = 30 } = {}) {
  const offset = (page - 1) * limit;
  const [countResult, listResult] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total FROM notifications n WHERE ${VISIBLE_WHERE}`,
      [userId]
    ),
    query(
      `SELECT n.id, n.title, n.message, n.type, n.product_id,
              n.starts_at, n.expires_at, n.published_at, n.created_at,
              p.image_url AS product_image_url,
              (nr.read_at IS NOT NULL) AS is_read,
              nr.read_at
       FROM notifications n
       LEFT JOIN products p ON p.id = n.product_id
       LEFT JOIN notification_reads nr
         ON nr.notification_id = n.id AND nr.user_id = $1
       WHERE ${VISIBLE_WHERE}
       ORDER BY n.published_at DESC, n.id DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);
  const total = countResult.rows[0]?.total ?? 0;
  return {
    items: listResult.rows.map((row) => ({
      ...row,
      id: Number(row.id),
      product_id: row.product_id == null ? null : Number(row.product_id),
      is_read: Boolean(row.is_read),
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getUnreadCount(userId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count
     FROM notifications n
     WHERE ${VISIBLE_WHERE}
       AND NOT EXISTS (
         SELECT 1 FROM notification_reads nr
         WHERE nr.notification_id = n.id AND nr.user_id = $1
       )`,
    [userId]
  );
  return { count: rows[0]?.count ?? 0 };
}

async function markAsRead(userId, notificationId) {
  const inserted = await query(
    `INSERT INTO notification_reads (notification_id, user_id)
     SELECT n.id, $1 FROM notifications n
     WHERE n.id = $2 AND ${VISIBLE_WHERE}
     ON CONFLICT (notification_id, user_id) DO NOTHING
     RETURNING notification_id`,
    [userId, notificationId]
  );
  if (inserted.rowCount > 0) return { id: notificationId, is_read: true };

  const visible = await query(
    `SELECT n.id FROM notifications n WHERE n.id = $2 AND ${VISIBLE_WHERE}`,
    [userId, notificationId]
  );
  if (!visible.rows[0]) throw new ApiError(404, 'Notificação não encontrada.');
  return { id: notificationId, is_read: true };
}

async function markAllAsRead(userId) {
  const result = await query(
    `INSERT INTO notification_reads (notification_id, user_id)
     SELECT n.id, $1 FROM notifications n
     WHERE ${VISIBLE_WHERE}
     ON CONFLICT (notification_id, user_id) DO NOTHING`,
    [userId]
  );
  return { updated: result.rowCount ?? 0 };
}

function sameIdempotentRequest(row, fields) {
  return row.type === fields.type &&
    Number(row.product_id || 0) === Number(fields.product_id || 0) &&
    row.title === fields.title && row.message === fields.message;
}

async function createByAdmin(fields, adminId) {
  if (fields.recipient_scope === 'user') {
    const target = await query(
      `SELECT id FROM users WHERE id = $1 AND role = 'customer' AND is_active = true`,
      [fields.recipient_user_id]
    );
    if (!target.rows[0]) throw new ApiError(404, 'Cliente destinatário não encontrado.');
  }

  if (fields.idempotency_key) {
    const existing = await query(
      `SELECT id, title, message, type, product_id, status, recipient_scope,
              recipient_user_id, starts_at, expires_at, created_at
       FROM notifications WHERE idempotency_key = $1`,
      [fields.idempotency_key]
    );
    if (existing.rows[0]) {
      if (!sameIdempotentRequest(existing.rows[0], fields)) {
        throw new ApiError(409, 'A chave de idempotência já foi usada para outra notificação.');
      }
      return existing.rows[0];
    }
  }

  const { rows } = await query(
    `INSERT INTO notifications
       (title, message, type, product_id, recipient_scope, recipient_user_id,
        status, idempotency_key, starts_at, expires_at, created_by, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING id, title, message, type, product_id, status, recipient_scope,
               recipient_user_id, starts_at, expires_at, created_at`,
    [fields.title, fields.message, fields.type, fields.product_id ?? null,
      fields.recipient_scope, fields.recipient_user_id ?? null, fields.status,
      fields.idempotency_key ?? null, fields.starts_at ?? null,
      fields.expires_at ?? null, adminId,
      fields.status === 'published' ? new Date() : null]
  );
  if (rows[0]) return rows[0];

  if (fields.idempotency_key) {
    const duplicate = await query(
      `SELECT id, title, message, type, product_id, status, recipient_scope,
              recipient_user_id, starts_at, expires_at, created_at
       FROM notifications WHERE idempotency_key = $1`,
      [fields.idempotency_key]
    );
    if (duplicate.rows[0] && sameIdempotentRequest(duplicate.rows[0], fields)) return duplicate.rows[0];
    throw new ApiError(409, 'A chave de idempotência já foi usada para outra notificação.');
  }
  throw new ApiError(500, 'Não foi possível criar a notificação.');
}

async function listForAdmin({ page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;
  const [countResult, result] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM notifications'),
    query(
      `SELECT n.id, n.title, n.message, n.type, n.product_id, n.status,
              n.recipient_scope, n.recipient_user_id, n.starts_at, n.expires_at,
              n.published_at, n.created_at, p.name AS product_name
       FROM notifications n
       LEFT JOIN products p ON p.id = n.product_id
       ORDER BY n.created_at DESC, n.id DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
  ]);
  const total = countResult.rows[0]?.total ?? 0;
  return { items: result.rows, page, limit, total, totalPages: Math.ceil(total / limit) };
}

async function archive(id) {
  const { rows } = await query(
    `UPDATE notifications SET status = 'archived', updated_at = now()
     WHERE id = $1 AND status <> 'archived'
     RETURNING id`,
    [id]
  );
  if (!rows[0]) throw new ApiError(404, 'Notificação não encontrada.');
  return { id: Number(rows[0].id), status: 'archived' };
}

module.exports = {
  listForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createByAdmin,
  listForAdmin,
  archive,
};
