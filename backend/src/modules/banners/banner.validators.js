const { z } = require('zod');

const hexColor = (field) => z.string()
  .regex(/^#[0-9A-Fa-f]{6}$/, `${field} deve ser uma cor hexadecimal válida (#RRGGBB).`);

const nullableHexColor = (field) => z.preprocess(
  (value) => value === '' ? null : value,
  hexColor(field).nullable().optional()
);

const nullableTrimmedText = (field, max) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().max(max, `${field} é demasiado longo.`).nullable().optional()
);

const nullableDate = z.preprocess(
  (value) => {
    if (value === '' || value === null) return null;
    if (value instanceof Date) return value.toISOString();
    return value;
  },
  z.string().datetime({ offset: true, message: 'Data inválida. Usa o formato ISO 8601 com fuso horário.' }).nullable().optional()
);

const positiveInt = (field) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
  z.number({ error: (issue) => issue.code === 'invalid_type' ? `${field} deve ser um número.` : undefined })
    .int(`${field} deve ser um inteiro.`)
    .positive(`${field} deve ser maior que zero.`)
);

const nullablePositiveInt = (field) => z.preprocess(
  (value) => value === '' || value === null ? null : typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
  z.number({ error: (issue) => issue.code === 'invalid_type' ? `${field} deve ser um número.` : undefined })
    .int(`${field} deve ser um inteiro.`)
    .positive(`${field} deve ser maior que zero.`)
    .nullable().optional()
);

const bannerTypes = ['promotion', 'category', 'product', 'announcement'];
const destinationTypes = ['none', 'product', 'category', 'url', 'product_list'];
const alignments = ['left', 'center', 'right'];

const bannerProductItemSchema = z.object({
  product_id: positiveInt('product_id'),
  sort_order: z.preprocess(
    (value) => value === undefined || value === null || value === '' ? undefined : Number(value),
    z.number({ error: (issue) => issue.code === 'invalid_type' ? 'sort_order deve ser um número.' : undefined })
      .int('sort_order deve ser um inteiro.')
      .optional()
  ),
}).strict();

function isSafeDestinationUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//');
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const destinationUrlSchema = z.preprocess(
  (value) => typeof value === 'string' ? value.trim() : value,
  z.string().max(2048, 'O URL de destino é demasiado longo.').nullable().optional()
);

const baseFields = {
  name: z.string({
    error: (issue) => issue.code === 'invalid_type' ? 'O nome é obrigatório.' : undefined,
  }).trim().min(1, 'O nome é obrigatório.').max(100, 'O nome é demasiado longo.'),
  title_pt: z.string({
    error: (issue) => issue.code === 'invalid_type' ? 'O título em português é obrigatório.' : undefined,
  }).trim().min(1, 'O título em português é obrigatório.').max(150, 'O título em português é demasiado longo.'),
  title_en: nullableTrimmedText('O título em inglês', 150),
  subtitle_pt: nullableTrimmedText('O subtítulo em português', 250),
  subtitle_en: nullableTrimmedText('O subtítulo em inglês', 250),
  image_url: z.string().trim().min(1, 'A imagem principal é obrigatória.').max(2048, 'O URL da imagem principal é demasiado longo.'),
  mobile_image_url: nullableTrimmedText('O URL da imagem mobile', 2048),
  background_color: hexColor('background_color').default('#111827'),
  title_color: hexColor('title_color').default('#FFFFFF'),
  subtitle_color: nullableHexColor('subtitle_color').default('#E5E7EB'),
  button_text_pt: nullableTrimmedText('O texto do botão em português', 50),
  button_text_en: nullableTrimmedText('O texto do botão em inglês', 50),
  button_color: nullableHexColor('button_color'),
  button_text_color: nullableHexColor('button_text_color'),
  alignment: z.enum(alignments, { message: 'alignment deve ser left, center ou right.' }).default('left'),
  overlay_opacity: z.preprocess(
    (value) => typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
    z.number({ error: (issue) => issue.code === 'invalid_type' ? 'overlay_opacity deve ser um número.' : undefined })
      .min(0, 'overlay_opacity deve estar entre 0 e 1.')
      .max(1, 'overlay_opacity deve estar entre 0 e 1.')
  ).default(0),
  banner_type: z.enum(bannerTypes, { message: 'banner_type inválido.' }).default('promotion'),
  destination_type: z.enum(destinationTypes, { message: 'destination_type inválido.' }).default('none'),
  product_id: nullablePositiveInt('product_id'),
  category_id: nullablePositiveInt('category_id'),
  destination_url: destinationUrlSchema,
  starts_at: nullableDate,
  expires_at: nullableDate,
  is_active: z.boolean({ error: 'is_active deve ser booleano.' }).default(true),
  sort_order: z.preprocess(
    (value) => value === undefined || value === null || value === '' ? 0 : Number(value),
    z.number({ error: (issue) => issue.code === 'invalid_type' ? 'sort_order deve ser um número.' : undefined })
      .int('sort_order deve ser um inteiro.')
  ).default(0),
  products: z.array(bannerProductItemSchema).max(100, 'Um banner pode ter no máximo 100 produtos associados.').optional(),
};

function refineDestination(value, context) {
  const destinationType = value.destination_type ?? 'none';
  const productId = value.product_id ?? null;
  const categoryId = value.category_id ?? null;
  const destinationUrl = value.destination_url == null || value.destination_url === '' ? null : value.destination_url;
  const products = value.products;

  if (value.image_url && !isSafeDestinationUrl(value.image_url)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['image_url'], message: 'A URL da imagem principal deve ser HTTP/HTTPS válida ou um caminho interno seguro.' });
  }
  if (value.mobile_image_url && !isSafeDestinationUrl(value.mobile_image_url)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['mobile_image_url'], message: 'A URL da imagem mobile deve ser HTTP/HTTPS válida ou um caminho interno seguro.' });
  }

  if (value.starts_at && value.expires_at && new Date(value.expires_at) <= new Date(value.starts_at)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['expires_at'], message: 'A data de expiração deve ser posterior à data de início.' });
  }

  if (destinationUrl !== null && !isSafeDestinationUrl(destinationUrl)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['destination_url'], message: 'O URL de destino deve ser HTTP/HTTPS válido ou um caminho interno seguro.' });
  }

  if (products !== undefined) {
    if (destinationType !== 'product_list') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['products'], message: 'Os produtos associados só são permitidos quando destination_type é product_list.' });
    }
    const ids = products.map((item) => item.product_id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['products'], message: 'A lista de produtos não pode conter duplicados.' });
    }
  }

  if (destinationType === 'none') {
    if (productId !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['product_id'], message: 'product_id não é permitido para destination_type none.' });
    if (categoryId !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['category_id'], message: 'category_id não é permitido para destination_type none.' });
    if (destinationUrl !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['destination_url'], message: 'destination_url não é permitido para destination_type none.' });
  }

  if (destinationType === 'product') {
    if (productId == null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['product_id'], message: 'product_id é obrigatório para destination_type product.' });
    if (categoryId !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['category_id'], message: 'category_id não é permitido para destination_type product.' });
    if (destinationUrl !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['destination_url'], message: 'destination_url não é permitido para destination_type product.' });
  }

  if (destinationType === 'category') {
    if (categoryId == null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['category_id'], message: 'category_id é obrigatório para destination_type category.' });
    if (productId !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['product_id'], message: 'product_id não é permitido para destination_type category.' });
    if (destinationUrl !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['destination_url'], message: 'destination_url não é permitido para destination_type category.' });
  }

  if (destinationType === 'url') {
    if (destinationUrl == null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['destination_url'], message: 'destination_url é obrigatório para destination_type url.' });
    if (productId !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['product_id'], message: 'product_id não é permitido para destination_type url.' });
    if (categoryId !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['category_id'], message: 'category_id não é permitido para destination_type url.' });
  }

  if (destinationType === 'product_list') {
    if (productId !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['product_id'], message: 'product_id não é permitido para destination_type product_list.' });
    if (categoryId !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['category_id'], message: 'category_id não é permitido para destination_type product_list.' });
    if (destinationUrl !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['destination_url'], message: 'destination_url não é permitido para destination_type product_list.' });
    if (value.is_active === true && (!Array.isArray(products) || products.length === 0)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['products'], message: 'Um banner product_list ativo deve ter pelo menos um produto associado.' });
    }
  }
}

const bannerCreateSchema = z.object(baseFields).strict().superRefine(refineDestination);

function withoutDefault(schema) {
  return schema instanceof z.ZodDefault ? schema.unwrap() : schema;
}

const bannerUpdateSchema = z.object(
  Object.fromEntries(
    Object.entries(baseFields).map(([field, schema]) => [field, withoutDefault(schema).optional()])
  )
).strict().refine((fields) => Object.keys(fields).length > 0, { message: 'Indica pelo menos um campo para atualizar.' });

const bannerPaginationSchema = z.object({
  page: z.preprocess((value) => value === undefined ? 1 : Number(value), z.number().int().min(1).max(100000)),
  limit: z.preprocess((value) => value === undefined ? 50 : Number(value), z.number().int().min(1).max(50)),
}).strict();

module.exports = {
  bannerCreateSchema,
  bannerUpdateSchema,
  bannerPaginationSchema,
};
