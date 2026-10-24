const { z } = require('zod');

const deliveryAddressIdSchema = z.number({
  error: (issue) => issue.code === 'invalid_type' ? 'deliveryAddressId deve ser um número.' : undefined,
});

const checkoutSchema = z.object({
  deliveryAddressId: deliveryAddressIdSchema.int('deliveryAddressId deve ser um inteiro.').positive('deliveryAddressId inválido.').nullable().optional(),
  couponCode: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

module.exports = { checkoutSchema };
