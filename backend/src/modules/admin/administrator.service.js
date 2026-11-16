// ─────────────────────────────────────────────
// VirtualShop API — Gestão de contas administrativas
// ─────────────────────────────────────────────
const bcrypt = require('bcrypt');
const { pool, query } = require('../../config/db');
const env = require('../../config/env');
const { ApiError } = require('../../middlewares/error.middleware');

const ADMIN_COLUMNS = `id, full_name, phone, email, role, is_active, created_at, last_login_at`;

function toAdministrator(row) {
  return {
    id: Number(row.id),
    full_name: row.full_name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
  };
}

async function listAdministrators() {
  const { rows } = await query(
    `SELECT ${ADMIN_COLUMNS}
     FROM users
     WHERE role = 'admin'
     ORDER BY is_active DESC, full_name ASC, id ASC`,
  );
  return rows.map(toAdministrator);
}

async function createAdministrator(fields) {
  const existing = await query(
    `SELECT id FROM users
     WHERE phone = $1 OR ($2::text IS NOT NULL AND email = $2)`,
    [fields.phone, fields.email ?? null],
  );
  if (existing.rows[0]) {
    throw new ApiError(409, 'Já existe uma conta com este email ou telemóvel.');
  }

  const passwordHash = await bcrypt.hash(
    fields.password,
    env.bcryptSaltRounds,
  );

  try {
    const { rows } = await query(
      `INSERT INTO users (full_name, phone, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, 'admin', $5)
       RETURNING ${ADMIN_COLUMNS}`,
      [
        fields.full_name,
        fields.phone,
        fields.email ?? null,
        passwordHash,
        fields.is_active ?? true,
      ],
    );
    return toAdministrator(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      throw new ApiError(409, 'Já existe uma conta com este email ou telemóvel.');
    }
    throw err;
  }
}

async function updateAdministrator(id, fields, actingUserId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const targetResult = await client.query(
      `SELECT id, role, is_active FROM users WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const target = targetResult.rows[0];
    if (!target || target.role !== 'admin') {
      throw new ApiError(404, 'Administrador não encontrado.');
    }

    const deactivating = fields.is_active === false && target.is_active;
    if (deactivating && Number(id) === Number(actingUserId)) {
      throw new ApiError(400, 'Não podes desactivar a tua própria conta.');
    }

    if (deactivating) {
      const activeResult = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM users
         WHERE role = 'admin' AND is_active = true AND id <> $1`,
        [id],
      );
      if (activeResult.rows[0].total === 0) {
        throw new ApiError(
          400,
          'Tem de existir pelo menos um administrador activo.',
        );
      }
    }

    const columns = {
      full_name: 'full_name',
      phone: 'phone',
      email: 'email',
      is_active: 'is_active',
    };
    const values = [];
    const assignments = [];

    for (const [key, column] of Object.entries(columns)) {
      if (Object.hasOwn(fields, key)) {
        values.push(fields[key]);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length === 0) {
      throw new ApiError(400, 'Indica pelo menos um campo para atualizar.');
    }

    values.push(id);
    const { rows } = await client.query(
      `UPDATE users
       SET ${assignments.join(', ')}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING ${ADMIN_COLUMNS}`,
      values,
    );

    if (fields.is_active === false) {
      await client.query(
        `UPDATE user_sessions
         SET revoked_at = now()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [id],
      );
      await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = now()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [id],
      );
    }

    await client.query('COMMIT');
    return toAdministrator(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (err.code === '23505') {
      throw new ApiError(409, 'Já existe uma conta com este email ou telemóvel.');
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listAdministrators,
  createAdministrator,
  updateAdministrator,
};
