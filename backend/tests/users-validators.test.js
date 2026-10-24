const test = require('node:test');
const assert = require('node:assert/strict');
const {
  profileUpdateSchema,
  changePasswordSchema,
  createAddressSchema,
  updateAddressSchema,
} = require('../src/modules/users/users.validators');

const validAddress = {
  label: 'Casa',
  province: 'Maputo',
  city: 'Maputo',
  neighborhood: 'Polana',
  street: 'Av. Julius Nyerere',
  number: '12B',
};

test('alteração de password exige password atual e uma nova password forte e diferente', () => {
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: 'OldPass123',
    newPassword: 'NewPass456',
  }).success, true);
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: 'OldPass123',
    newPassword: 'oldpass456',
  }).success, false);
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: 'SamePass123',
    newPassword: 'SamePass123',
  }).success, false);
});

test('perfil aceita telefones locais e internacionais em formato E.164', () => {
  assert.equal(profileUpdateSchema.parse({ phone: '+258841234567' }).phone, '+258841234567');
  assert.equal(profileUpdateSchema.parse({ phone: '841234567' }).phone, '841234567');
  assert.equal(profileUpdateSchema.parse({ phone: '+27821234567' }).phone, '+27821234567');
  assert.equal(profileUpdateSchema.parse({ phone: '+5511912345678' }).phone, '+5511912345678');
});

test('perfil rejeita telefone inválido, data futura e género fora da whitelist', () => {
  assert.equal(profileUpdateSchema.safeParse({ phone: '+1234567890123456' }).success, false);
  assert.equal(profileUpdateSchema.safeParse({ birthDate: '2999-01-01' }).success, false);
  assert.equal(profileUpdateSchema.safeParse({ gender: 'unknown' }).success, false);
});

test('perfil aceita payload camelCase para atualizar informações pessoais', () => {
  const result = profileUpdateSchema.parse({
    fullName: 'Carlos Mavume',
    phone: '+258841234567',
    birthDate: '1992-08-17',
    gender: 'male',
  });

  assert.deepEqual(result, {
    fullName: 'Carlos Mavume',
    phone: '+258841234567',
    birthDate: '1992-08-17',
    gender: 'male',
  });
  assert.equal(
    profileUpdateSchema.safeParse({ full_name: 'Carlos Mavume' }).success,
    false,
  );
});

test('perfil não aceita alteração de email nem identificador do utilizador', () => {
  assert.equal(profileUpdateSchema.safeParse({ email: 'other@example.com' }).success, false);
  assert.equal(profileUpdateSchema.safeParse({ user_id: 99, fullName: 'Nome' }).success, false);
});

test('endereços validam campos obrigatórios e limites geográficos', () => {
  assert.equal(createAddressSchema.safeParse(validAddress).success, true);
  assert.equal(createAddressSchema.safeParse({ ...validAddress, latitude: 91 }).success, false);
  assert.equal(createAddressSchema.safeParse({ ...validAddress, longitude: -181 }).success, false);
  assert.equal(createAddressSchema.safeParse({ ...validAddress, user_id: 99 }).success, false);
});

test('edição de endereço exige ao menos um campo e aceita coordenada nula', () => {
  assert.equal(updateAddressSchema.safeParse({}).success, false);
  assert.equal(updateAddressSchema.safeParse({ latitude: null }).success, true);
});
