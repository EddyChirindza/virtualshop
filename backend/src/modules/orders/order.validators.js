const { z } = require('zod');
const { ORDER_STATUSES, DELIVERY_METHODS } = require('./order.status');

const deliveryAddressIdSchema = z.number({
  error: (issue) => issue.code === 'invalid_type' ? 'deliveryAddressId deve ser um número.' : undefined,
});

const paymentMethodIdSchema = z.number({
  error: (issue) => issue.code === 'invalid_type' ? 'paymentMethodId deve ser um número.' : undefined,
});

const checkoutSchema = z.object({
  deliveryAddressId: deliveryAddressIdSchema.int('deliveryAddressId deve ser um inteiro.').positive('deliveryAddressId inválido.').nullable().optional(),
  paymentMethodId: paymentMethodIdSchema.int('paymentMethodId deve ser um inteiro.').positive('paymentMethodId inválido.').nullable().optional(),
  deliveryMethod: z.enum(DELIVERY_METHODS).optional(),
  couponCode: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const emptyToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const listOrdersQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, z.enum(ORDER_STATUSES).optional()),
  search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  from: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida.').optional()
  ),
  to: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final inválida.').optional()
  ),
  page: z.preprocess(
    (value) => value === undefined ? 1 : Number(value),
    z.number().int().min(1).max(100000)
  ),
  limit: z.preprocess(
    (value) => value === undefined ? 50 : Number(value),
    z.number().int().min(1).max(100)
  ),
}).superRefine((value, context) => {
  if (value.from && value.to && value.from > value.to) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['to'],
      message: 'A data final deve ser posterior à data inicial.',
    });
  }
});

const rejectOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Indica o motivo da rejeição.').max(500),
});

const updateOrderStatusSchema = z.object({
  status: z.enum([
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'completed',
    'cancelled',
  ]),
});

module.exports = {
  checkoutSchema,
  listOrdersQuerySchema,
  rejectOrderSchema,
  updateOrderStatusSchema,
};
