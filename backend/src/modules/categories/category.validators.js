const { z } = require('zod');

const nullableParent = z.preprocess(
  (value) => value === '' || value === null ? null : typeof value === 'string' ? Number(value) : value,
  z.number().int().positive().nullable().optional()
);
const nullableIcon = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().max(2048).nullable().optional()
);
const categoryFields = {
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.').max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'O slug deve conter letras minúsculas, números e hífens.'),
  icon_url: nullableIcon,
  parent_id: nullableParent,
};
const categoryCreateSchema = z.object(categoryFields);
const categoryUpdateSchema = z.object(categoryFields).partial().refine((fields) => Object.keys(fields).length > 0, 'Indica pelo menos um campo para atualizar.');
module.exports = { categoryCreateSchema, categoryUpdateSchema };
