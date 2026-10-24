const test = require('node:test');
const assert = require('node:assert/strict');
const {
  registerSchema,
  loginSchema,
} = require('../src/modules/auth/auth.validators');

const validRegistration = {
  full_name: 'Maria Silva',
  phone: '+258841234567',
  password: 'Password1',
};

test('registo aceita email omitido ou vazio', () => {
  assert.equal(registerSchema.parse(validRegistration).email, undefined);
  assert.equal(registerSchema.parse({ ...validRegistration, email: '  ' }).email, undefined);
});

test('registo continua a validar e normalizar email quando fornecido', () => {
  assert.equal(
    registerSchema.parse({
      ...validRegistration,
      email: '  Maria@Example.COM  ',
    }).email,
    'maria@example.com',
  );
  assert.equal(
    registerSchema.safeParse({ ...validRegistration, email: 'not-an-email' })
      .success,
    false,
  );
});

test('login aceita número internacional no campo identifier', () => {
  assert.equal(
    loginSchema.parse({
      identifier: '+258841234567',
      password: 'Password1',
    }).identifier,
    '+258841234567',
  );
});

test('registo aceita telefone com até 15 dígitos E.164 e rejeita acima do limite', () => {
  assert.equal(
    registerSchema.safeParse({
      ...validRegistration,
      phone: '+123456789012345',
    }).success,
    true,
  );
  assert.equal(
    registerSchema.safeParse({
      ...validRegistration,
      phone: '+1234567890123456',
    }).success,
    false,
  );
  assert.equal(
    registerSchema.safeParse({
      ...validRegistration,
      phone: '841234567',
    }).success,
    true,
  );
});