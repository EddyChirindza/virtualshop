const { z } = require('zod');

const addCartItemSchema = z.object({
  productId: z.number({ invalid_type_error: 'productId deve ser um número.' }).int('productId deve ser um inteiro.').positive('productId inválido.'),
  quantity: z.number({ invalid_type_error: 'quantity deve ser um número.' }).int('quantity deve ser um inteiro.').positive('quantity deve ser maior que zero.'),
});

const updateCartItemSchema = z.object({
  quantity: z.number({ invalid_type_error: 'quantity deve ser um número.' }).int('quantity deve ser um inteiro.').min(0, 'quantity deve ser maior ou igual a zero.'),
});

module.exports = { addCartItemSchema, updateCartItemSchema };
