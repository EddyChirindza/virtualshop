const { z } = require('zod');

const addFavoriteSchema = z.object({
  productId: z
    .number({ invalid_type_error: 'productId deve ser um número.' })
    .int('productId deve ser um inteiro.')
    .positive('productId inválido.'),
});

module.exports = { addFavoriteSchema };
