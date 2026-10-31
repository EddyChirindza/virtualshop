const { pool, query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');

const paymentMethodReturning = `id, type, label, provider, account_name, phone,
                                card_brand, card_last4, expiry_month, expiry_year,
                                is_default, created_at, updated_at`;

function normalizePaymentMethod(row) {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    provider: row.provider,
    phone: row.phone,
    accountName: row.account_name,
    cardBrand: row.card_brand,
    cardLast4: row.card_last4,
    expiryMonth: row.expiry_month === null ? null : Number(row.expiry_month),
    expiryYear: row.expiry_year === null ? null : Number(row.expiry_year),
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanLabel(value) {
  if (value === undefined) return undefined;
  const label = value?.trim();
  return label ? label : null;
}

function assertExpiryNotPast(month, year) {
  const now = new Date();
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    throw new ApiError(400, 'A validade do cartão já expirou.');
  }
}

function uniqueViolation(err) {
  return err.code === '23505';
}

function uniqueConflict(err) {
  if (err.constraint === 'idx_payment_methods_unique_mpesa_phone') {
    return new ApiError(409, 'Este número M-Pesa já está associado a um método de pagamento.');
  }
  if (err.constraint === 'idx_payment_methods_provider_token') {
    return new ApiError(409, 'Este método de pagamento já está associado à conta.');
  }
  return null;
}

function hasAnyField(input, fields) {
  return fields.some((field) => Object.hasOwn(input, field));
}

async function withUserLock(userId, operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query(
      'SELECT id FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
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

async function listPaymentMethods(userId) {
  const { rows } = await query(
    `SELECT ${paymentMethodReturning} FROM payment_methods
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC, id DESC`,
    [userId]
  );
  return rows.map(normalizePaymentMethod);
}

async function createPaymentMethod(userId, input) {
  return withUserLock(userId, async (client) => {
    const existing = await client.query(
      'SELECT 1 FROM payment_methods WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    const makeDefault = existing.rowCount === 0 || input.isDefault === true;

    if (makeDefault) {
      await client.query(
        'UPDATE payment_methods SET is_default = false WHERE user_id = $1',
        [userId]
      );
    }

    const label = cleanLabel(input.label) ?? null;
    const values = input.type === 'mpesa'
      ? [
          userId, 'mpesa', label, 'mock', null, input.phone,
          null, null, null, null, null, makeDefault,
        ]
      : [
          userId, 'visa', label, 'mock', input.cardHolder, null,
          'visa', input.cardNumber.slice(-4), input.expiryMonth,
          input.expiryYear, null, makeDefault,
        ];

    try {
      const { rows } = await client.query(
        `INSERT INTO payment_methods
         (user_id, type, label, provider, account_name, phone, card_brand,
          card_last4, expiry_month, expiry_year, provider_token, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING ${paymentMethodReturning}`,
        values
      );
      return normalizePaymentMethod(rows[0]);
    } catch (err) {
      if (uniqueViolation(err)) {
        const conflict = uniqueConflict(err);
        if (conflict) throw conflict;
      }
      throw err;
    }
  });
}

async function updatePaymentMethod(userId, paymentMethodId, input) {
  return withUserLock(userId, async (client) => {
    const { rows: currentRows } = await client.query(
      `SELECT ${paymentMethodReturning} FROM payment_methods
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [paymentMethodId, userId]
    );
    const current = currentRows[0];
    if (!current) throw new ApiError(404, 'Método de pagamento não encontrado.');

    const cardFields = ['cardNumber', 'cardHolder', 'expiryMonth', 'expiryYear'];
    if (current.type === 'mpesa' && hasAnyField(input, cardFields)) {
      throw new ApiError(400, 'Um método M-Pesa não aceita dados de cartão.');
    }
    if (current.type === 'visa' && Object.hasOwn(input, 'phone')) {
      throw new ApiError(400, 'Um cartão Visa não aceita número de telefone.');
    }

    const assignments = [];
    const values = [];
    const set = (column, value) => {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    };

    if (Object.hasOwn(input, 'label')) set('label', cleanLabel(input.label));
    if (current.type === 'mpesa' && Object.hasOwn(input, 'phone')) {
      set('phone', input.phone);
    }

    if (current.type === 'visa') {
      if (Object.hasOwn(input, 'cardNumber')) {
        set('card_brand', 'visa');
        set('card_last4', input.cardNumber.slice(-4));
      }
      if (Object.hasOwn(input, 'cardHolder')) {
        set('account_name', input.cardHolder);
      }
      if (Object.hasOwn(input, 'expiryMonth') || Object.hasOwn(input, 'expiryYear')) {
        const month = input.expiryMonth ?? Number(current.expiry_month);
        const year = input.expiryYear ?? Number(current.expiry_year);
        assertExpiryNotPast(month, year);
        set('expiry_month', month);
        set('expiry_year', year);
      }
    }

    if (input.isDefault === true) {
      await client.query(
        'UPDATE payment_methods SET is_default = false WHERE user_id = $1',
        [userId]
      );
      set('is_default', true);
    }

    if (assignments.length === 0) return normalizePaymentMethod(current);

    assignments.push('updated_at = now()');
    values.push(paymentMethodId, userId);

    try {
      const { rows } = await client.query(
        `UPDATE payment_methods SET ${assignments.join(', ')}
         WHERE id = $${values.length - 1} AND user_id = $${values.length}
         RETURNING ${paymentMethodReturning}`,
        values
      );
      if (!rows[0]) throw new ApiError(404, 'Método de pagamento não encontrado.');
      return normalizePaymentMethod(rows[0]);
    } catch (err) {
      if (uniqueViolation(err)) {
        const conflict = uniqueConflict(err);
        if (conflict) throw conflict;
      }
      throw err;
    }
  });
}

async function deletePaymentMethod(userId, paymentMethodId) {
  return withUserLock(userId, async (client) => {
    const selected = await client.query(
      'SELECT is_default FROM payment_methods WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [paymentMethodId, userId]
    );
    if (!selected.rows[0]) throw new ApiError(404, 'Método de pagamento não encontrado.');

    await client.query(
      'DELETE FROM payment_methods WHERE id = $1 AND user_id = $2',
      [paymentMethodId, userId]
    );

    if (selected.rows[0].is_default) {
      await client.query(
        `UPDATE payment_methods SET is_default = true, updated_at = now()
         WHERE id = (
           SELECT id FROM payment_methods WHERE user_id = $1
           ORDER BY created_at DESC, id DESC LIMIT 1
         )`,
        [userId]
      );
    }

    return { deleted: true };
  });
}

async function setDefaultPaymentMethod(userId, paymentMethodId) {
  return withUserLock(userId, async (client) => {
    const existing = await client.query(
      'SELECT id FROM payment_methods WHERE id = $1 AND user_id = $2',
      [paymentMethodId, userId]
    );
    if (!existing.rows[0]) throw new ApiError(404, 'Método de pagamento não encontrado.');

    await client.query(
      'UPDATE payment_methods SET is_default = false WHERE user_id = $1',
      [userId]
    );
    const { rows } = await client.query(
      `UPDATE payment_methods SET is_default = true, updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING ${paymentMethodReturning}`,
      [paymentMethodId, userId]
    );
    return normalizePaymentMethod(rows[0]);
  });
}

module.exports = {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
};
