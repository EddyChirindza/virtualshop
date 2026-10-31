const test = require('node:test');
const assert = require('node:assert/strict');

const { query } = require('../src/config/db');
const paymentMethodsService = require('../src/modules/payment_methods/payment_methods.service');

async function resetDb() {
  await query("DELETE FROM users WHERE email LIKE 'payment.methods.%@example.com'");

  const { rows } = await query(
    `INSERT INTO users (full_name, phone, email, password_hash, role)
     VALUES
       ('Cliente Pagamentos', '+258840001001', 'payment.methods.one@example.com', 'unused', 'customer'),
       ('Outro Cliente', '+258840001002', 'payment.methods.two@example.com', 'unused', 'customer')
     RETURNING id`
  );

  return { userId: rows[0].id, otherUserId: rows[1].id };
}

function mpesaInput(overrides = {}) {
  return {
    type: 'mpesa',
    label: 'M-Pesa pessoal',
    phone: '+258841234567',
    ...overrides,
  };
}

function visaInput(overrides = {}) {
  return {
    type: 'visa',
    label: 'Cartão principal',
    cardNumber: '4111111111111111',
    cardHolder: 'Ana Mucavele',
    expiryMonth: 12,
    expiryYear: new Date().getUTCFullYear() + 2,
    ...overrides,
  };
}

test('primeiro método fica padrão e o segundo não', async () => {
  const { userId } = await resetDb();

  const mpesa = await paymentMethodsService.createPaymentMethod(userId, mpesaInput());
  const visa = await paymentMethodsService.createPaymentMethod(userId, visaInput());

  assert.equal(mpesa.isDefault, true);
  assert.equal(visa.isDefault, false);
  assert.equal(mpesa.phone, '+258841234567');
  assert.equal(visa.cardLast4, '1111');
  assert.equal(visa.accountName, 'Ana Mucavele');
});

test('cartão guarda apenas o último 1111 e nunca o número completo', async () => {
  const { userId } = await resetDb();

  const visa = await paymentMethodsService.createPaymentMethod(userId, visaInput());
  const { rows } = await query(
    'SELECT card_last4, card_brand FROM payment_methods WHERE id = $1',
    [visa.id]
  );

  assert.equal(rows[0].card_last4, '1111');
  assert.equal(rows[0].card_brand, 'visa');
});

test('edita telefone e label de um método M-Pesa', async () => {
  const { userId } = await resetDb();
  const mpesa = await paymentMethodsService.createPaymentMethod(userId, mpesaInput());

  const updated = await paymentMethodsService.updatePaymentMethod(userId, mpesa.id, {
    label: 'Número alternativo',
    phone: '841111111',
  });

  assert.equal(updated.label, 'Número alternativo');
  assert.equal(updated.phone, '841111111');
});

test('edita validade e nome do cartão sem alterar o número', async () => {
  const { userId } = await resetDb();
  const visa = await paymentMethodsService.createPaymentMethod(userId, visaInput());

  const updated = await paymentMethodsService.updatePaymentMethod(userId, visa.id, {
    cardHolder: 'Ana Maria Mucavele',
    expiryMonth: 6,
    expiryYear: new Date().getUTCFullYear() + 3,
  });

  assert.equal(updated.accountName, 'Ana Maria Mucavele');
  assert.equal(updated.cardLast4, '1111');
  assert.equal(updated.expiryMonth, 6);
});

test('define um novo padrão e remove-o ao apagar o método', async () => {
  const { userId } = await resetDb();
  const mpesa = await paymentMethodsService.createPaymentMethod(userId, mpesaInput());
  const visa = await paymentMethodsService.createPaymentMethod(userId, visaInput());

  const selected = await paymentMethodsService.setDefaultPaymentMethod(userId, visa.id);
  assert.equal(selected.isDefault, true);

  let methods = await paymentMethodsService.listPaymentMethods(userId);
  assert.equal(methods.find((item) => item.id === mpesa.id).isDefault, false);

  await paymentMethodsService.deletePaymentMethod(userId, visa.id);
  methods = await paymentMethodsService.listPaymentMethods(userId);
  assert.equal(methods.length, 1);
  assert.equal(methods[0].id, mpesa.id);
  assert.equal(methods[0].isDefault, true);
});

test('não permite consultar nem alterar métodos de outro utilizador', async () => {
  const { userId, otherUserId } = await resetDb();
  const visa = await paymentMethodsService.createPaymentMethod(otherUserId, visaInput());

  await assert.rejects(
    () => paymentMethodsService.updatePaymentMethod(userId, visa.id, { label: 'Alheio' }),
    (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    }
  );

  await assert.rejects(
    () => paymentMethodsService.setDefaultPaymentMethod(userId, visa.id),
    (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    }
  );

  await assert.rejects(
    () => paymentMethodsService.deletePaymentMethod(userId, visa.id),
    (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    }
  );
});

test('rejeita campos incompatíveis com o tipo do método', async () => {
  const { userId } = await resetDb();
  const mpesa = await paymentMethodsService.createPaymentMethod(userId, mpesaInput());
  const visa = await paymentMethodsService.createPaymentMethod(userId, visaInput());

  await assert.rejects(
    () => paymentMethodsService.updatePaymentMethod(userId, mpesa.id, {
      cardHolder: 'Ana Mucavele',
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    }
  );

  await assert.rejects(
    () => paymentMethodsService.updatePaymentMethod(userId, visa.id, {
      phone: '841234567',
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    }
  );
});
