const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createAdministratorSchema,
  updateAdministratorSchema,
} = require('../src/modules/admin/administrator.validators');

const validAdministrator = {
  full_name: 'Ana Admin',
  phone: '+258841234567',
  email: 'ana@example.com',
  password: 'Password1',
};

test('criação de administrador normaliza email e aceita email vazio', () => {
  assert.equal(
    createAdministratorSchema.parse({
      ...validAdministrator,
      email: '  Ana@Example.COM ',
    }).email,
    'ana@example.com',
  );
  assert.equal(
    createAdministratorSchema.parse({
      ...validAdministrator,
      email: '   ',
    }).email,
    null,
  );
  assert.equal(
    createAdministratorSchema.parse({
      ...validAdministrator,
      email: undefined,
    }).email,
    undefined,
  );
});

test('criação de administrador exige password forte e telefone válido', () => {
  assert.equal(
    createAdministratorSchema.safeParse({
      ...validAdministrator,
      password: 'weakpass',
    }).success,
    false,
  );
  assert.equal(
    createAdministratorSchema.safeParse({
      ...validAdministrator,
      phone: '+1234567890123456',
    }).success,
    false,
  );
});

test('actualização exige pelo menos um campo e não aceita password', () => {
  assert.equal(updateAdministratorSchema.safeParse({}).success, false);
  assert.equal(
    updateAdministratorSchema.safeParse({ is_active: false }).success,
    true,
  );
  assert.equal(
    updateAdministratorSchema.safeParse({ password: 'Password1' }).success,
    false,
  );
});

test('actualização valida email e permite limpá-lo', () => {
  assert.equal(
    updateAdministratorSchema.safeParse({ email: 'not-an-email' }).success,
    false,
  );
  assert.equal(updateAdministratorSchema.parse({ email: '' }).email, null);
});
