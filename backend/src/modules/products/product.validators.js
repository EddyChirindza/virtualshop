const { z } = require('zod');

const numberWithTypeMessage = (message) => z.number({
  error: (issue) => issue.code === 'invalid_type' ? message : undefined,
});

const optionalNumber = (schema) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
  schema
);

const optionalCategoryId = optionalNumber(
  numberWithTypeMessage('category deve ser um número.')
    .int('category deve ser um inteiro.')
    .positive('category deve ser maior que zero.')
).optional();

const optionalPrice = (field) => optionalNumber(
  numberWithTypeMessage(`${field} deve ser um número.`)
    .nonnegative(`${field} não pode ser negativo.`)
).optional();

const optionalPage = optionalNumber(
  numberWithTypeMessage('page deve ser um número.')
    .int('page deve ser um inteiro.')
    .positive('page deve ser maior que zero.')
).optional();

const optionalLimit = (field) => optionalNumber(
  numberWithTypeMessage(`${field} deve ser um número.`)
    .int(`${field} deve ser um inteiro.`)
    .min(1, `${field} deve ser pelo menos 1.`)
    .max(50, `${field} não pode ser superior a 50.`)
).optional();

const productListSchema = z.object({
  q: z.preprocess((value) => typeof value === 'string' ? value.trim() : value,
    z.string().max(100, 'q não pode ter mais de 100 caracteres.').optional()),
  category: optionalCategoryId,
  category_id: optionalCategoryId,
  minPrice: optionalPrice('minPrice'),
  maxPrice: optionalPrice('maxPrice'),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'newest'], {
    error: 'sort deve ser relevance, price_asc, price_desc ou newest.',
  }).optional(),
  page: optionalPage,
  limit: optionalLimit('limit'),
  page_size: optionalLimit('page_size'),
}).superRefine((params, context) => {
  if (params.minPrice !== undefined && params.maxPrice !== undefined && params.minPrice > params.maxPrice) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['minPrice'], message: 'minPrice não pode ser superior a maxPrice.' });
  }
});

const nullableText = (field, max = 5000) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().max(max, `${field} é demasiado longo.`).nullable().optional()
);
const productFields = {
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.').max(150),
  description: nullableText('A descrição'),
  price: z.preprocess((value) => typeof value === 'string' ? Number(value) : value,
    numberWithTypeMessage('O preço deve ser numérico.').finite().nonnegative('O preço não pode ser negativo.')),
  stock: z.preprocess((value) => typeof value === 'string' ? Number(value) : value,
    numberWithTypeMessage('O stock deve ser numérico.').int('O stock deve ser inteiro.').nonnegative('O stock não pode ser negativo.')).optional(),
  stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
  image_url: nullableText('A URL da imagem', 2048),
  category_id: z.preprocess((value) => value === '' || value === null ? null : typeof value === 'string' ? Number(value) : value,
    z.number().int().positive().nullable().optional()),
  is_popular: z.boolean().optional(),
  is_new_arrival: z.boolean().optional(),
};
const productCreateSchema = z.object(productFields);
const productUpdateSchema = z.object(productFields).partial().refine((fields) => Object.keys(fields).length > 0, 'Indica pelo menos um campo para atualizar.');

module.exports = { productListSchema, productCreateSchema, productUpdateSchema };
