const { z } = require('zod');

const numberWithTypeMessage = (message) => z.number({
  error: (issue) => issue.code === 'invalid_type' ? message : undefined,
});

const addCartItemSchema = z.object({
  productId: numberWithTypeMessage('productId deve ser um número.').int('productId deve ser um inteiro.').positive('productId inválido.'),
  quantity: numberWithTypeMessage('quantity deve ser um número.').int('quantity deve ser um inteiro.').positive('quantity deve ser maior que zero.'),
});

const updateCartItemSchema = z.object({
  quantity: numberWithTypeMessage('quantity deve ser um número.').int('quantity deve ser um inteiro.').min(0, 'quantity deve ser maior ou igual a zero.'),
});

module.exports = { addCartItemSchema, updateCartItemSchema };
