// ─────────────────────────────────────────────
// VirtualShop API — Validação da gestão de administradores
// ─────────────────────────────────────────────
const { z } = require('zod');

const fullName = z
  .string()
  .trim()
  .min(3, 'Nome demasiado curto.')
  .max(150, 'Nome demasiado longo.');

const phone = z
  .string()
  .trim()
  .regex(
    /^(?:[0-9]{9,15}|\+[1-9][0-9]{7,14})$/,
    'Telemóvel inválido.',
  );

const email = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().toLowerCase().email('Email inválido.').nullable().optional(),
);

const password = z
  .string()
  .min(8, 'A password deve ter pelo menos 8 caracteres.')
  .regex(/[A-Z]/, 'A password deve ter pelo menos uma letra maiúscula.')
  .regex(/[a-z]/, 'A password deve ter pelo menos uma letra minúscula.')
  .regex(/[0-9]/, 'A password deve ter pelo menos um número.');

const createAdministratorSchema = z.object({
  full_name: fullName,
  phone,
  email,
  password,
  is_active: z.boolean().optional().default(true),
});

const updateAdministratorSchema = z
  .object({
    full_name: fullName.optional(),
    phone: phone.optional(),
    email,
    is_active: z.boolean().optional(),
  })
  .refine(
    (fields) => Object.keys(fields).length > 0,
    'Indica pelo menos um campo para atualizar.',
  );

module.exports = {
  createAdministratorSchema,
  updateAdministratorSchema,
};
