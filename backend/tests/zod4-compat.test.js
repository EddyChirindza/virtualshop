const test = require('node:test');
const assert = require('node:assert/strict');

const { productListSchema, productCreateSchema } = require('../src/modules/products/product.validators');
const { profileUpdateSchema } = require('../src/modules/users/users.validators');
const { addFavoriteSchema } = require('../src/modules/favorites/favorites.validators');
const { checkoutSchema } = require('../src/modules/orders/order.validators');
const { addCartItemSchema, updateCartItemSchema } = require('../src/modules/cart/cart.validators');
const { errorHandler } = require('../src/middlewares/error.middleware');

function firstIssueMessage(schema, input) {
  const result = schema.safeParse(input);
  assert.equal(result.success, false, 'a entrada inválida deve ser rejeitada');
  return result.error.issues[0].message;
}

test('schemas preservam mensagens claras de tipo com Zod 4', () => {
  assert.equal(firstIssueMessage(productListSchema, { category: {} }), 'category deve ser um número.');
  assert.equal(firstIssueMessage(productCreateSchema, {
    name: 'Produto', price: {},
  }), 'O preço deve ser numérico.');
  assert.equal(firstIssueMessage(addFavoriteSchema, { productId: '12' }), 'productId deve ser um número.');
  assert.equal(firstIssueMessage(checkoutSchema, { deliveryAddressId: {} }), 'deliveryAddressId deve ser um número.');
  assert.equal(firstIssueMessage(addCartItemSchema, { productId: 1, quantity: '2' }), 'quantity deve ser um número.');
  assert.equal(firstIssueMessage(updateCartItemSchema, { quantity: null }), 'quantity deve ser um número.');
  assert.equal(firstIssueMessage(profileUpdateSchema, { gender: 'unknown' }), 'Género inválido.');
});

test('middleware devolve a primeira mensagem de validação Zod 4', () => {
  const response = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  errorHandler({
    name: 'ZodError',
    issues: [{ message: 'productId deve ser um número.' }],
  }, {}, response, () => {});

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    success: false,
    message: 'productId deve ser um número.',
  });
});

test('validações de inteiro e faixa continuam a rejeitar valores inválidos', () => {
  assert.equal(firstIssueMessage(addFavoriteSchema, { productId: 1.5 }), 'productId deve ser um inteiro.');
  assert.equal(firstIssueMessage(addCartItemSchema, { productId: 1, quantity: 0 }), 'quantity deve ser maior que zero.');
  assert.equal(firstIssueMessage(productListSchema, { limit: '1000' }), 'limit não pode ser superior a 50.');
});
