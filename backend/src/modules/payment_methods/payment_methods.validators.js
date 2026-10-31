const { z } = require('zod');

const currentYear = new Date().getUTCFullYear();
const currentMonth = new Date().getUTCMonth() + 1;

const labelSchema = z.string()
  .trim()
  .max(50, 'O nome do método não pode exceder 50 caracteres.')
  .nullable()
  .optional();

const phoneSchema = z.string()
  .trim()
  .max(25, 'Número de telefone inválido.')
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .refine(
    (value) => /^(?:[0-9]{9,15}|\+[1-9][0-9]{7,14})$/.test(value),
    'Número de telefone inválido.',
  );

const cardNumberSchema = z.string()
  .trim()
  .max(23, 'Número do cartão inválido.')
  .transform((value) => value.replace(/[\s-]/g, ''))
  .refine(
    (value) => /^4[0-9]{12,18}$/.test(value),
    'Introduz um número de cartão Visa válido.',
  );

const cardHolderSchema = z.string()
  .trim()
  .min(2, 'Indica o nome no cartão.')
  .max(150, 'O nome no cartão não pode exceder 150 caracteres.');

const expiryMonthSchema = z.number()
  .int('O mês de validade deve ser um inteiro.')
  .min(1, 'Mês de validade inválido.')
  .max(12, 'Mês de validade inválido.');

const expiryYearSchema = z.number()
  .int('O ano de validade deve ser um inteiro.')
  .min(currentYear, 'A validade do cartão já expirou.')
  .max(currentYear + 30, 'Ano de validade inválido.');

const isDefaultSchema = z.boolean().optional();

const createPaymentMethodSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('mpesa'),
    label: labelSchema,
    phone: phoneSchema,
    isDefault: isDefaultSchema,
  }).strict(),
  z.object({
    type: z.literal('visa'),
    label: labelSchema,
    cardNumber: cardNumberSchema,
    cardHolder: cardHolderSchema,
    expiryMonth: expiryMonthSchema,
    expiryYear: expiryYearSchema,
    isDefault: isDefaultSchema,
  }).strict().refine(
    (value) =>
      value.expiryYear > currentYear ||
      (value.expiryYear === currentYear && value.expiryMonth >= currentMonth),
    'A validade do cartão já expirou.',
  ),
]);

const updatePaymentMethodSchema = z.object({
  label: labelSchema,
  phone: phoneSchema.optional(),
  cardNumber: cardNumberSchema.optional(),
  cardHolder: cardHolderSchema.optional(),
  expiryMonth: expiryMonthSchema.optional(),
  expiryYear: expiryYearSchema.optional(),
  isDefault: z.boolean().optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  'Indica pelo menos um campo para atualizar.',
);

module.exports = {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
};
