const { z } = require('zod');

const notificationTypes = ['new_product', 'promotion', 'discount', 'product_alert', 'general', 'order_update'];
const positiveInt = z.preprocess(
  (value) => typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
  z.number().int().positive()
);
const nullableDate = z.preprocess(
  (value) => value === '' || value === null ? null : value,
  z.string().datetime({ offset: true }).nullable().optional()
);

const paginationSchema = z.object({
  page: z.preprocess((value) => value === undefined ? 1 : Number(value), z.number().int().min(1).max(100000)),
  limit: z.preprocess((value) => value === undefined ? 30 : Number(value), z.number().int().min(1).max(50)),
});

const createNotificationSchema = z.object({
  title: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(500),
  type: z.enum(notificationTypes),
  product_id: positiveInt.nullable().optional(),
  recipient_scope: z.enum(['all_customers', 'user']).default('all_customers'),
  recipient_user_id: positiveInt.nullable().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  idempotency_key: z.string().trim().min(1).max(200).optional(),
  starts_at: nullableDate,
  expires_at: nullableDate,
}).strict().superRefine((value, context) => {
  if (value.recipient_scope === 'user' && !value.recipient_user_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['recipient_user_id'], message: 'Seleciona o cliente destinatário.' });
  }
  if (value.recipient_scope === 'all_customers' && value.recipient_user_id != null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['recipient_user_id'], message: 'Notificações globais não podem ter um destinatário individual.' });
  }
  if (value.starts_at && value.expires_at && new Date(value.expires_at) <= new Date(value.starts_at)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['expires_at'], message: 'A validade deve terminar depois do início.' });
  }
});

module.exports = { notificationTypes, paginationSchema, createNotificationSchema };
