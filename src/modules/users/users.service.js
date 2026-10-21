const bcrypt = require('bcrypt');
const profilePhotoService = require('./profile_photo.service');
const { pool, query } = require('../../config/db');
const env = require('../../config/env');
const { ApiError } = require('../../middlewares/error.middleware');

const profileColumns = {
  fullName: 'full_name',
  email: 'email',
  phone: 'phone',
  birthDate: 'birth_date',
  gender: 'gender',
};

const addressColumns = {
  label: 'label',
  province: 'province',
  city: 'city',
  neighborhood: 'neighborhood',
  street: 'street',
  number: '"number"',
  reference: 'reference',
  latitude: 'geo_lat',
  longitude: 'geo_lng',
};

const addressReturning = `id, label, province, city, neighborhood, street, "number", reference,
                         geo_lat AS latitude, geo_lng AS longitude, is_default, created_at`;

function normalizeAddress(row) {
  return {
    id: row.id,
    label: row.label,
    province: row.province,
    city: row.city,
    neighborhood: row.neighborhood,
    street: row.street,
    number: row.number,
    reference: row.reference,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

async function getProfile(userId) {
  const { rows } = await query(
    `SELECT id, full_name, email, phone, birth_date, gender, avatar_url,
            COALESCE(is_verified, false) AS is_verified, last_login_at, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  const user = rows[0];
  if (!user) throw new ApiError(404, 'Utilizador não encontrado.');

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    birthDate: user.birth_date,
    gender: user.gender,
    avatarUrl: user.avatar_url,
    isVerified: user.is_verified,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
  };
}

async function updateProfile(userId, input) {
  if (Object.prototype.hasOwnProperty.call(input, 'email')) {
    const { rows: currentRows } = await query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );
    if (!currentRows[0]) throw new ApiError(404, 'Utilizador não encontrado.');
    const currentEmail = currentRows[0].email?.trim().toLowerCase() || '';
    if (currentEmail && currentEmail !== input.email) {
      throw new ApiError(409, 'O e-mail não pode ser alterado depois de guardado.');
    }
  }

  const entries = Object.entries(input);
  const values = entries.map(([, value]) => value);
  const assignments = entries.map(([key], index) => `${profileColumns[key]} = $${index + 1}`);

  let rows;
  try {
    ({ rows } = await query(
      `UPDATE users SET ${assignments.join(', ')}, updated_at = now()
       WHERE id = $${values.length + 1}
       RETURNING id, full_name, email, phone, birth_date, gender, avatar_url,
                 COALESCE(is_verified, false) AS is_verified, last_login_at, created_at`,
      [...values, userId]
    ));
  } catch (err) {
    if (err.code === '23505' && entries.some(([key]) => key === 'phone')) {
      throw new ApiError(409, 'Este telemóvel já está associado a outra conta.');
    }
    if (err.code === '23505' && entries.some(([key]) => key === 'email')) {
      throw new ApiError(409, 'Este e-mail já está associado a outra conta.');
    }
    throw err;
  }

  const user = rows[0];
  if (!user) throw new ApiError(404, 'Utilizador não encontrado.');

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    birthDate: user.birth_date,
    gender: user.gender,
    avatarUrl: user.avatar_url,
    isVerified: user.is_verified,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
  };
}

async function updateProfilePhoto(userId, base64) {
  const photo = await profilePhotoService.saveProfilePhoto({ base64 });
  try {
    const { rows } = await query(
      `UPDATE users SET avatar_url = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, full_name, email, phone, birth_date, gender, avatar_url,
                 COALESCE(is_verified, false) AS is_verified, last_login_at, created_at`,
      [photo.avatar_url, userId]
    );
    const user = rows[0];
    if (!user) throw new ApiError(404, 'Utilizador não encontrado.');
    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      birthDate: user.birth_date,
      gender: user.gender,
      avatarUrl: user.avatar_url,
      isVerified: user.is_verified,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    };
  } catch (err) {
    await profilePhotoService.removeProfilePhoto(photo.avatar_url);
    throw err;
  }
}

async function updatePassword(userId, { currentPassword, newPassword }) {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) throw new ApiError(404, 'Utilizador não encontrado.');

  const passwordMatches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!passwordMatches) throw new ApiError(400, 'A password atual está incorreta.');

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  await query(
    'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
    [passwordHash, userId]
  );
}

async function getStats(userId) {
  const [ordersResult, favoritesResult] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total_orders, COALESCE(SUM(total), 0) AS total_spent
       FROM orders WHERE user_id = $1`,
      [userId]
    ),
    query('SELECT COUNT(*) AS favorites_count FROM favorites WHERE user_id = $1', [userId]),
  ]);

  return {
    totalOrders: Number(ordersResult.rows[0].total_orders),
    totalSpent: Number(ordersResult.rows[0].total_spent),
    averageRating: null,
    favoritesCount: Number(favoritesResult.rows[0].favorites_count),
  };
}

async function withUserLock(userId, operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!userResult.rows[0]) throw new ApiError(404, 'Utilizador não encontrado.');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listAddresses(userId) {
  const { rows } = await query(
    `SELECT ${addressReturning} FROM addresses
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC, id DESC`,
    [userId]
  );
  return rows.map(normalizeAddress);
}

async function createAddress(userId, input) {
  return withUserLock(userId, async (client) => {
    const existing = await client.query('SELECT 1 FROM addresses WHERE user_id = $1 LIMIT 1', [userId]);
    const isDefault = existing.rowCount === 0;
    const { rows } = await client.query(
      `INSERT INTO addresses
       (user_id, label, province, city, neighborhood, street, "number", reference, geo_lat, geo_lng, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${addressReturning}`,
      [
        userId,
        input.label,
        input.province,
        input.city,
        input.neighborhood,
        input.street,
        input.number,
        input.reference ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        isDefault,
      ]
    );
    return normalizeAddress(rows[0]);
  });
}

async function updateAddress(userId, addressId, input) {
  const entries = Object.entries(input);
  const values = entries.map(([, value]) => value);
  const assignments = entries.map(([key], index) => `${addressColumns[key]} = $${index + 1}`);
  const { rows } = await query(
    `UPDATE addresses SET ${assignments.join(', ')}
     WHERE id = $${values.length + 1} AND user_id = $${values.length + 2}
     RETURNING ${addressReturning}`,
    [...values, addressId, userId]
  );
  if (!rows[0]) throw new ApiError(404, 'Endereço não encontrado.');
  return normalizeAddress(rows[0]);
}

async function deleteAddress(userId, addressId) {
  return withUserLock(userId, async (client) => {
    const selected = await client.query(
      'SELECT is_default FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );
    if (!selected.rows[0]) throw new ApiError(404, 'Endereço não encontrado.');

    await client.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
    if (selected.rows[0].is_default) {
      await client.query(
        `UPDATE addresses SET is_default = true
         WHERE id = (
           SELECT id FROM addresses WHERE user_id = $1
           ORDER BY created_at DESC, id DESC LIMIT 1
         )`,
        [userId]
      );
    }
    return { deleted: true };
  });
}

async function setDefaultAddress(userId, addressId) {
  return withUserLock(userId, async (client) => {
    const address = await client.query(
      `SELECT ${addressReturning} FROM addresses WHERE id = $1 AND user_id = $2`,
      [addressId, userId]
    );
    if (!address.rows[0]) throw new ApiError(404, 'Endereço não encontrado.');

    await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
    const { rows } = await client.query(
      `UPDATE addresses SET is_default = true
       WHERE id = $1 AND user_id = $2
       RETURNING ${addressReturning}`,
      [addressId, userId]
    );
    return normalizeAddress(rows[0]);
  });
}

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePhoto,
  updatePassword,
  getStats,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
