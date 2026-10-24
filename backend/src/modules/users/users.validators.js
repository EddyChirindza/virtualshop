const { z } = require('zod');

const genderValues = ['male', 'female', 'other', 'prefer_not_to_say'];
const newPasswordSchema = z.string()
  .min(8, 'A password deve ter pelo menos 8 caracteres.')
  .regex(/[A-Z]/, 'A password deve ter pelo menos uma letra maiúscula.')
  .regex(/[a-z]/, 'A password deve ter pelo menos uma letra minúscula.')
  .regex(/[0-9]/, 'A password deve ter pelo menos um número.');

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Indica a password atual.'),
  newPassword: newPasswordSchema,
}).strict().refine(
  (value) => value.currentPassword !== value.newPassword,
  'A nova password deve ser diferente da atual.',
);

const birthDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Data de nascimento inválida.')
  .refine((value) => value <= new Date().toISOString().slice(0, 10), 'A data de nascimento não pode ser futura.');

const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'O nome deve ter entre 2 e 100 caracteres.').max(100, 'O nome deve ter entre 2 e 100 caracteres.').optional(),
  phone: z
    .string()
    .trim()
    .regex(
      /^(?:[0-9]{9,15}|\+[1-9][0-9]{7,14})$/,
      'Número de telefone inválido.',
    )
    .optional(),
  birthDate: birthDateSchema.nullable().optional(),
  gender: z.enum(genderValues, { error: 'Género inválido.' }).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Indica pelo menos um campo para atualizar.');

const addressFields = {
  label: z.string().trim().min(1, 'Indica o nome do local.').max(50, 'O nome do local não pode exceder 50 caracteres.'),
  province: z.string().trim().min(1, 'Indica a província.').max(100, 'A província não pode exceder 100 caracteres.'),
  city: z.string().trim().min(1, 'Indica a cidade.').max(100, 'A cidade não pode exceder 100 caracteres.'),
  neighborhood: z.string().trim().min(1, 'Indica o bairro.').max(100, 'O bairro não pode exceder 100 caracteres.'),
  street: z.string().trim().min(1, 'Indica a avenida ou rua.').max(300, 'A avenida ou rua não pode exceder 300 caracteres.'),
  number: z.string().trim().min(1, 'Indica o número do endereço.').max(30, 'O número não pode exceder 30 caracteres.'),
  reference: z.string().trim().max(500, 'A referência não pode exceder 500 caracteres.').nullable().optional(),
  latitude: z.number().finite().min(-90, 'Latitude inválida.').max(90, 'Latitude inválida.').nullable().optional(),
  longitude: z.number().finite().min(-180, 'Longitude inválida.').max(180, 'Longitude inválida.').nullable().optional(),
};

const createAddressSchema = z.object({
  label: addressFields.label,
  province: addressFields.province,
  city: addressFields.city,
  neighborhood: addressFields.neighborhood,
  street: addressFields.street,
  number: addressFields.number,
  reference: addressFields.reference,
  latitude: addressFields.latitude,
  longitude: addressFields.longitude,
}).strict();

const updateAddressSchema = z.object({
  label: addressFields.label.optional(),
  province: addressFields.province.optional(),
  city: addressFields.city.optional(),
  neighborhood: addressFields.neighborhood.optional(),
  street: addressFields.street.optional(),
  number: addressFields.number.optional(),
  reference: addressFields.reference,
  latitude: addressFields.latitude,
  longitude: addressFields.longitude,
}).strict().refine((value) => Object.keys(value).length > 0, 'Indica pelo menos um campo para atualizar.');

module.exports = {
  profileUpdateSchema,
  createAddressSchema,
  updateAddressSchema,
  changePasswordSchema,
};
