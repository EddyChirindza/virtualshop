const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
} = require('../src/modules/payment_methods/payment_methods.validators');

const futureYear = new Date().getUTCFullYear() + 2;

test('cria método M-Pesa e normaliza o telefone', () => {
  const result = createPaymentMethodSchema.parse({
    type: 'mpesa',
    label: 'M-Pesa pessoal',
    phone: '+258 84 123 4567',
  });

  assert.deepEqual(result, {
    type: 'mpesa',
    label: 'M-Pesa pessoal',
    phone: '+258841234567',
  });
});

test('cria cartão Visa e normaliza o número', () => {
  const result = createPaymentMethodSchema.parse({
    type: 'visa',
    label: 'Cartão principal',
    cardNumber: '4111 1111 1111 1111',
    cardHolder: 'Ana Mucavele',
    expiryMonth: 12,
    expiryYear: futureYear,
    isDefault: true,
  });

  assert.equal(result.cardNumber, '4111111111111111');
  assert.equal(result.expiryYear, futureYear);
  assert.equal(result.isDefault, true);
});

test('rejeita cartões não Visa, validade passada e campos desconhecidos', () => {
  assert.equal(createPaymentMethodSchema.safeParse({
    type: 'visa',
    cardNumber: '5111111111111111',
    cardHolder: 'Ana Mucavele',
    expiryMonth: 12,
    expiryYear: futureYear,
  }).success, false);

  assert.equal(createPaymentMethodSchema.safeParse({
    type: 'visa',
    cardNumber: '4111111111111111',
    cardHolder: 'Ana Mucavele',
    expiryMonth: 1,
    expiryYear: 2020,
  }).success, false);

  assert.equal(createPaymentMethodSchema.safeParse({
    type: 'mpesa',
    phone: '+258841234567',
    user_id: 99,
  }).success, false);
});

test('edição exige pelo menos um campo e rejeita dados fora do contrato', () => {
  assert.equal(updatePaymentMethodSchema.safeParse({}).success, false);
  assert.equal(updatePaymentMethodSchema.safeParse({ label: 'Novo nome' }).success, true);
  assert.equal(updatePaymentMethodSchema.safeParse({ phone: '841234567' }).success, true);
  assert.equal(updatePaymentMethodSchema.safeParse({ provider_token: 'secret' }).success, false);
});
