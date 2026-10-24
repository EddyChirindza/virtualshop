const { z } = require('zod');

const productIdSchema = z.number({
  error: (issue) => issue.code === 'invalid_type' ? 'productId deve ser um número.' : undefined,
});

const addFavoriteSchema = z.object({
  productId: productIdSchema
    .int('productId deve ser um inteiro.')
    .positive('productId inválido.'),
});

module.exports = { addFavoriteSchema };
