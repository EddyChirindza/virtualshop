const { z } = require('zod');

const checkoutSchema = z.object({
  deliveryAddressId: z.number({ invalid_type_error: 'deliveryAddressId deve ser um número.' }).int('deliveryAddressId deve ser um inteiro.').positive('deliveryAddressId inválido.').nullable().optional(),
  couponCode: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

module.exports = { checkoutSchema };
