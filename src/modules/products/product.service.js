// ─────────────────────────────────────────────
// VirtualShop API — Serviço de produtos
// ─────────────────────────────────────────────
const { query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');

// category_name vem de um JOIN — é o que o ProductModel do Flutter espera
const BASE_SELECT = `
  SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url,
         p.rating, p.is_popular, p.is_new_arrival,
         p.category_id, c.name AS category_name,
         CASE WHEN p.stock = 0 THEN 'out_of_stock' WHEN p.stock <= 5 THEN 'low_stock' ELSE 'in_stock' END AS stock_status
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

async function getPopular() {
  const { rows } = await query(`${BASE_SELECT} WHERE p.is_popular = true ORDER BY p.rating DESC, p.id DESC`);
  return rows;
}

async function getNewArrivals() {
  const { rows } = await query(`${BASE_SELECT} WHERE p.is_new_arrival = true ORDER BY p.created_at DESC`);
  return rows;
}

async function getById(id) {
  const { rows } = await query(`${BASE_SELECT} WHERE p.id = $1`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Produto não encontrado.');
  return rows[0];
}

async function getAll({ q, categoryId, minPrice, maxPrice, sort, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];
  let categoryCte = '';
  let searchOrderParams;

  if (categoryId) {
    params.push(categoryId);
    categoryCte = `WITH RECURSIVE category_tree AS (
      SELECT id FROM categories WHERE id = $${params.length}
      UNION
      SELECT c.id FROM categories c
      JOIN category_tree parent ON c.parent_id = parent.id
    )`;
    conditions.push('p.category_id IN (SELECT id FROM category_tree)');
  }
  if (q) {
    const escapedQuery = q.replace(/[\\%_]/g, '\\$&');
    params.push(`${escapedQuery}%`);
    const startsWithParam = `$${params.length}`;
    params.push(`%${escapedQuery}%`);
    const containsParam = `$${params.length}`;
    searchOrderParams = { startsWithParam, containsParam };
    conditions.push(`(p.name ILIKE ${startsWithParam} ESCAPE '\\' OR p.name ILIKE ${containsParam} ESCAPE '\\' OR p.description ILIKE ${containsParam} ESCAPE '\\')`);
  }
  if (minPrice !== undefined) { params.push(minPrice); conditions.push(`p.price >= $${params.length}`); }
  if (maxPrice !== undefined) { params.push(maxPrice); conditions.push(`p.price <= $${params.length}`); }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query(`${categoryCte} SELECT COUNT(*)::int AS total FROM products p ${whereClause}`, [...params]);
  const selectedSort = sort || (q ? 'relevance' : 'newest');
  let orderBy = 'p.created_at DESC, p.id DESC';
  if (selectedSort === 'price_asc') orderBy = 'p.price ASC, p.id DESC';
  if (selectedSort === 'price_desc') orderBy = 'p.price DESC, p.id DESC';
  if (selectedSort === 'relevance' && q) {
    const { startsWithParam, containsParam } = searchOrderParams;
    orderBy = `CASE WHEN p.name ILIKE ${startsWithParam} ESCAPE '\\' THEN 0 WHEN p.name ILIKE ${containsParam} ESCAPE '\\' THEN 1 ELSE 2 END, p.created_at DESC, p.id DESC`;
  }
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  const { rows } = await query(`${categoryCte} ${BASE_SELECT} ${whereClause} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  const total = countResult.rows[0].total;
  return { data: rows, page, limit, total, totalPages: Math.ceil(total / limit) };
}

function quantityForStatus(status, currentStock = 0) {
  if (status === 'out_of_stock') return 0;
  if (status === 'low_stock') return currentStock > 0 && currentStock <= 5 ? currentStock : 5;
  if (status === 'in_stock') return currentStock > 5 ? currentStock : 6;
  return currentStock;
}

async function create(fields) {
  const stock = fields.stock_status
    ? quantityForStatus(fields.stock_status)
    : (fields.stock ?? 0);
  const { rows } = await query(
    `INSERT INTO products (name, description, price, stock, image_url, category_id, is_popular, is_new_arrival)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [fields.name, fields.description ?? null, fields.price, stock, fields.image_url ?? null,
      fields.category_id ?? null, fields.is_popular ?? false, fields.is_new_arrival ?? true]
  );
  return getById(rows[0].id);
}

async function update(id, fields) {
  if (fields.stock_status) {
    const existing = await query('SELECT stock FROM products WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new ApiError(404, 'Produto não encontrado.');
    fields = { ...fields, stock: quantityForStatus(fields.stock_status, Number(existing.rows[0].stock)) };
  }
  const columns = {
    name: 'name', description: 'description', price: 'price', stock: 'stock', stock_status: null,
    image_url: 'image_url', category_id: 'category_id',
    is_popular: 'is_popular', is_new_arrival: 'is_new_arrival',
  };
  const values = [];
  const assignments = [];
  for (const [key, column] of Object.entries(columns)) {
    if (column && Object.hasOwn(fields, key)) {
      values.push(fields[key]);
      assignments.push(`${column} = $${values.length}`);
    }
  }
  values.push(id);
  const result = await query(`UPDATE products SET ${assignments.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING id`, values);
  if (!result.rows[0]) throw new ApiError(404, 'Produto não encontrado.');
  return getById(id);
}

async function remove(id) {
  try {
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) throw new ApiError(404, 'Produto não encontrado.');
  } catch (err) {
    if (err.code === '23503') throw new ApiError(409, 'Este produto já faz parte de encomendas e não pode ser eliminado.');
    throw err;
  }
}

module.exports = { getPopular, getNewArrivals, getById, getAll, create, update, remove };
