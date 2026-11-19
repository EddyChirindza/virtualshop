const { pool, query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');
const { removeUnreferencedUploadsSafely } = require('../../services/upload_files.service');
const { bannerCreateSchema } = require('./banner.validators');

const INSERTABLE_FIELDS = [
  'name', 'title_pt', 'title_en', 'subtitle_pt', 'subtitle_en',
  'image_url', 'mobile_image_url', 'background_color', 'title_color',
  'subtitle_color', 'button_text_pt', 'button_text_en', 'button_color',
  'button_text_color', 'alignment', 'overlay_opacity', 'banner_type',
  'destination_type', 'product_id', 'category_id', 'destination_url',
  'starts_at', 'expires_at', 'is_active', 'sort_order',
];

const PRODUCT_COLUMNS = `
  p.id, p.name, p.price, p.image_url,
  CASE WHEN cardinality(p.image_urls) > 0 THEN p.image_urls
       WHEN p.image_url IS NOT NULL AND btrim(p.image_url) <> '' THEN ARRAY[p.image_url]
       ELSE ARRAY[]::text[] END AS image_urls,
  p.category_id, c.name AS category_name
`;
const PRODUCT_JOINS = `
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

function normalizeRow(row) {
  return {
    ...row,
    id: Number(row.id),
    product_id: row.product_id == null ? null : Number(row.product_id),
    category_id: row.category_id == null ? null : Number(row.category_id),
    overlay_opacity: row.overlay_opacity == null ? 0 : Number(row.overlay_opacity),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
  };
}

function normalizeProduct(product) {
  return {
    id: Number(product.id),
    name: product.name,
    price: Number(product.price),
    image_url: product.image_url,
    image_urls: product.image_urls || [],
    category_id: product.category_id == null ? null : Number(product.category_id),
    category_name: product.category_name,
  };
}

function toBannerState(row, products) {
  const state = {};
  for (const field of INSERTABLE_FIELDS) {
    state[field] = row[field] ?? null;
  }
  state.overlay_opacity = row.overlay_opacity == null ? 0 : Number(row.overlay_opacity);
  state.sort_order = Number(row.sort_order ?? 0);
  state.is_active = Boolean(row.is_active);
  if (row.destination_type === 'product_list' && products !== undefined) state.products = products;
  return state;
}

function translations(pt, en) {
  return { pt: pt ?? null, en: en ?? null };
}

function styleFrom(row) {
  return {
    background_color: row.background_color,
    title_color: row.title_color,
    subtitle_color: row.subtitle_color,
    button_color: row.button_color,
    button_text_color: row.button_text_color,
    alignment: row.alignment,
    overlay_opacity: Number(row.overlay_opacity ?? 0),
  };
}

function toPublicBanner(row, { productsByBanner, productsById, categoriesById }) {
  const destination = { type: row.destination_type };
  let product;
  if (row.destination_type === 'product') {
    product = productsById.get(Number(row.product_id));
    if (product) destination.product = product;
  } else if (row.destination_type === 'category') {
    const category = categoriesById.get(Number(row.category_id));
    if (category) destination.category = category;
  } else if (row.destination_type === 'url') {
    destination.url = row.destination_url;
  } else if (row.destination_type === 'product_list') {
    destination.products = productsByBanner.get(Number(row.id)) || [];
  }

  return {
    id: Number(row.id),
    title: translations(row.title_pt, row.title_en),
    subtitle: translations(row.subtitle_pt, row.subtitle_en),
    image_url: row.image_url,
    mobile_image_url: row.mobile_image_url || row.image_url,
    style: styleFrom(row),
    button_text: translations(row.button_text_pt, row.button_text_en),
    banner_type: row.banner_type,
    destination,
    starts_at: row.starts_at,
    expires_at: row.expires_at,
    sort_order: Number(row.sort_order ?? 0),
  };
}

async function getProductsForBanners(runQuery, bannerIds) {
  if (bannerIds.length === 0) return new Map();
  const { rows } = await runQuery(
    `SELECT bp.banner_id, ${PRODUCT_COLUMNS}
     ${PRODUCT_JOINS}
     JOIN banner_products bp ON bp.product_id = p.id
     WHERE bp.banner_id = ANY($1::int[])
     ORDER BY bp.banner_id, bp.sort_order, bp.product_id`,
    [bannerIds]
  );
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(Number(row.banner_id))) grouped.set(Number(row.banner_id), []);
    grouped.get(Number(row.banner_id)).push(normalizeProduct(row));
  }
  return grouped;
}

async function getReferencedProducts(runQuery, ids) {
  if (ids.length === 0) return new Map();
  const { rows } = await runQuery(
    `SELECT ${PRODUCT_COLUMNS} ${PRODUCT_JOINS} WHERE p.id = ANY($1::int[])`,
    [ids]
  );
  return new Map(rows.map((row) => [Number(row.id), normalizeProduct(row)]));
}

async function getReferencedCategories(runQuery, ids) {
  if (ids.length === 0) return new Map();
  const { rows } = await runQuery(
    `SELECT id, name, slug, icon_url FROM categories WHERE id = ANY($1::int[])`,
    [ids]
  );
  return new Map(rows.map((row) => [Number(row.id), {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    icon_url: row.icon_url,
  }]));
}

async function getPublic() {
  const { rows } = await query(
    `SELECT b.* FROM banners b
     WHERE b.is_active = true
       AND (b.starts_at IS NULL OR b.starts_at <= now())
       AND (b.expires_at IS NULL OR b.expires_at > now())
     ORDER BY b.sort_order ASC, b.id ASC`
  );
  const bannerIds = rows.map((row) => Number(row.id));
  const productIds = rows
    .filter((row) => row.destination_type === 'product')
    .map((row) => Number(row.product_id));
  const categoryIds = rows
    .filter((row) => row.destination_type === 'category')
    .map((row) => Number(row.category_id));

  const [productsByBanner, productsById, categoriesById] = await Promise.all([
    getProductsForBanners(query, bannerIds),
    getReferencedProducts(query, productIds),
    getReferencedCategories(query, categoryIds),
  ]);

  return {
    items: rows.map((row) => toPublicBanner(row, { productsByBanner, productsById, categoriesById })),
  };
}

async function listAdmin({ page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;
  const [countResult, listResult] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM banners'),
    query(
      `SELECT * FROM banners ORDER BY sort_order ASC, id ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
  ]);
  const total = countResult.rows[0]?.total ?? 0;
  return {
    items: listResult.rows.map(normalizeRow),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getAdminProducts(bannerId, runQuery = query) {
  const { rows } = await runQuery(
    `SELECT product_id, sort_order FROM banner_products
     WHERE banner_id = $1 ORDER BY sort_order ASC, product_id ASC`,
    [bannerId]
  );
  return rows.map((row) => ({
    product_id: Number(row.product_id),
    sort_order: Number(row.sort_order),
  }));
}

async function getAdminById(id, runQuery = query) {
  const { rows } = await runQuery('SELECT * FROM banners WHERE id = $1', [id]);
  if (!rows[0]) throw new ApiError(404, 'Banner não encontrado.');
  const banner = normalizeRow(rows[0]);
  banner.products = await getAdminProducts(id, runQuery);
  return banner;
}

async function assertReferences(client, fields) {
  if (fields.product_id != null) {
    const { rows } = await client.query('SELECT id FROM products WHERE id = $1', [fields.product_id]);
    if (!rows[0]) throw new ApiError(400, 'O produto associado ao banner não existe.');
  }
  if (fields.category_id != null) {
    const { rows } = await client.query('SELECT id FROM categories WHERE id = $1', [fields.category_id]);
    if (!rows[0]) throw new ApiError(400, 'A categoria associada ao banner não existe.');
  }
  if (Array.isArray(fields.products) && fields.products.length > 0) {
    const ids = fields.products.map((item) => item.product_id);
    const { rows } = await client.query(
      'SELECT id FROM products WHERE id = ANY($1::int[])',
      [ids]
    );
    if (rows.length !== new Set(ids).size) {
      throw new ApiError(400, 'Um ou mais produtos associados ao banner não existem.');
    }
  }
}

function normalizeProducts(products) {
  return products.map((item, index) => ({
    product_id: Number(item.product_id),
    sort_order: item.sort_order === undefined ? index : Number(item.sort_order),
  }));
}

async function replaceProducts(client, bannerId, products) {
  await client.query('DELETE FROM banner_products WHERE banner_id = $1', [bannerId]);
  if (products.length === 0) return;
  const ids = products.map((item) => item.product_id);
  const orders = products.map((item) => item.sort_order);
  await client.query(
    `INSERT INTO banner_products (banner_id, product_id, sort_order)
     SELECT $1, items.product_id, items.sort_order
     FROM unnest($2::int[], $3::int[]) AS items(product_id, sort_order)`,
    [bannerId, ids, orders]
  );
}

function translateDatabaseError(err) {
  if (err.code === '23505') {
    return new ApiError(409, 'Já existe um banner com este nome.');
  }
  if (err.code === '23503') {
    if (err.constraint === 'banners_category_id_fkey') {
      return new ApiError(400, 'A categoria associada ao banner não existe.');
    }
    if (err.constraint === 'banner_products_product_id_fkey') {
      return new ApiError(400, 'Um ou mais produtos associados ao banner não existem.');
    }
    return new ApiError(400, 'O produto associado ao banner não existe.');
  }
  if (err.code === '23514' || err.code === '23502') {
    return new ApiError(400, 'Os dados do banner violam as regras de integridade.');
  }
  return err;
}

async function withBannerTransaction(operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw translateDatabaseError(err);
  } finally {
    client.release();
  }
}

async function create(input) {
  const fields = bannerCreateSchema.parse(input);
  const products = normalizeProducts(fields.products || []);
  return withBannerTransaction(async (client) => {
    await assertReferences(client, fields);
    const values = INSERTABLE_FIELDS.map((field) => fields[field] ?? null);
    const columns = INSERTABLE_FIELDS.join(', ');
    const placeholders = INSERTABLE_FIELDS.map((_, index) => `$${index + 1}`).join(', ');
    const { rows } = await client.query(
      `INSERT INTO banners (${columns}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    const id = Number(rows[0].id);
    await replaceProducts(client, id, products);
    return getAdminById(id, (sql, params) => client.query(sql, params));
  });
}

async function update(id, patch) {
  const previous = await getAdminById(id);
  const merged = toBannerState(previous, previous.products);
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = value;
  }
  if (merged.destination_type !== 'product_list') delete merged.products;
  const fields = bannerCreateSchema.parse(merged);
  const products = normalizeProducts(fields.products || []);
  const releasedImages = [previous.image_url, previous.mobile_image_url].filter(Boolean)
    .filter((url) => url !== fields.image_url && url !== fields.mobile_image_url);

  const result = await withBannerTransaction(async (client) => {
    const locked = await client.query('SELECT * FROM banners WHERE id = $1 FOR UPDATE', [id]);
    if (!locked.rows[0]) throw new ApiError(404, 'Banner não encontrado.');
    await assertReferences(client, fields);

    const assignments = [];
    const values = [];
    for (const field of INSERTABLE_FIELDS) {
      values.push(fields[field] ?? null);
      assignments.push(`${field} = $${values.length}`);
    }
    values.push(id);
    const result = await client.query(
      `UPDATE banners SET ${assignments.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING id`,
      values
    );
    if (!result.rows[0]) throw new ApiError(404, 'Banner não encontrado.');
    await replaceProducts(client, id, products);
    return getAdminById(id, (sql, params) => client.query(sql, params));
  });
  await removeUnreferencedUploadsSafely(releasedImages);
  return result;
}

async function remove(id) {
  const banner = await getAdminById(id);
  const releasedImages = [banner.image_url, banner.mobile_image_url].filter(Boolean);
  await withBannerTransaction(async (client) => {
    const result = await client.query('DELETE FROM banners WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) throw new ApiError(404, 'Banner não encontrado.');
  });
  await removeUnreferencedUploadsSafely(releasedImages);
  return { id: Number(id) };
}

module.exports = {
  getPublic,
  listAdmin,
  getAdminById,
  create,
  update,
  remove,
};
