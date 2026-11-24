// ─────────────────────────────────────────────
// VirtualShop API — Serviço de produtos
// ─────────────────────────────────────────────
const { pool, query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');
const { removeUnreferencedUploadsSafely } = require('../../services/upload_files.service');

// category_name vem de um JOIN — é o que o ProductModel do Flutter espera
const BASE_SELECT = `
  SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url,
         CASE WHEN cardinality(p.image_urls) > 0 THEN p.image_urls
              WHEN p.image_url IS NOT NULL AND btrim(p.image_url) <> '' THEN ARRAY[p.image_url]
              ELSE ARRAY[]::text[] END AS image_urls,
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
  const imageUrls = Object.hasOwn(fields, 'image_urls')
    ? fields.image_urls
    : (fields.image_url ? [fields.image_url] : []);
  const imageUrl = imageUrls[0] ?? null;
  const stock = Object.hasOwn(fields, 'stock')
    ? fields.stock
    : fields.stock_status
      ? quantityForStatus(fields.stock_status)
      : 0;
  const { rows } = await query(
    `INSERT INTO products (name, description, price, stock, image_url, image_urls, category_id, is_popular, is_new_arrival)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [fields.name, fields.description ?? null, fields.price, stock, imageUrl, imageUrls,
      fields.category_id ?? null, fields.is_popular ?? false, fields.is_new_arrival ?? true]
  );
  return getById(rows[0].id);
}

async function update(id, fields) {
  let previousImages = [];
  if (Object.hasOwn(fields, 'image_urls') || Object.hasOwn(fields, 'image_url')) {
    previousImages = (await getById(id)).image_urls;
  }
  if (!Object.hasOwn(fields, 'stock') && fields.stock_status) {
    const existing = await query('SELECT stock FROM products WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new ApiError(404, 'Produto não encontrado.');
    fields = { ...fields, stock: quantityForStatus(fields.stock_status, Number(existing.rows[0].stock)) };
  }
  if (Object.hasOwn(fields, 'image_urls')) {
    fields = { ...fields, image_url: fields.image_urls[0] ?? null };
  } else if (Object.hasOwn(fields, 'image_url')) {
    fields = { ...fields, image_urls: fields.image_url ? [fields.image_url] : [] };
  }
  const columns = {
    name: 'name', description: 'description', price: 'price', stock: 'stock', stock_status: null,
    image_url: 'image_url', image_urls: 'image_urls', category_id: 'category_id',
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
  const updated = await getById(id);
  if (previousImages.length > 0) {
    await removeUnreferencedUploadsSafely(previousImages);
  }
  return updated;
}

const BANNER_PRODUCT_CONSTRAINTS = new Set([
  'banners_product_id_fkey',
  'banner_products_product_id_fkey',
]);

async function isLinkedToBanner(productId) {
  try {
    const { rows } = await query(
      `SELECT EXISTS(SELECT 1 FROM banners WHERE product_id = $1)
              OR EXISTS(SELECT 1 FROM banner_products WHERE product_id = $1) AS linked`,
      [productId]
    );
    return Boolean(rows[0]?.linked);
  } catch {
    return false;
  }
}

async function remove(id) {
  const product = await getById(id);
  try {
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) throw new ApiError(404, 'Produto não encontrado.');
  } catch (err) {
    if (err.code === '23503') {
      if (BANNER_PRODUCT_CONSTRAINTS.has(err.constraint) || await isLinkedToBanner(id)) {
        throw new ApiError(409, 'Este produto está associado a um ou mais banners e não pode ser eliminado.');
      }
      throw new ApiError(409, 'Este produto já faz parte de encomendas e não pode ser eliminado.');
    }
    throw err;
  }
  if (product.image_urls.length > 0) {
    await removeUnreferencedUploadsSafely(product.image_urls);
  }
}

async function getReviews(productId, userId, { page = 1, limit = 20 } = {}) {
  await getById(productId);
  const offset = (page - 1) * limit;
  const [countResult, distributionResult, reviewsResult, ownResult] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS count,
              COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average
       FROM product_reviews WHERE product_id = $1`,
      [productId]
    ),
    query(
      `SELECT rating, COUNT(*)::int AS count
       FROM product_reviews WHERE product_id = $1
       GROUP BY rating`,
      [productId]
    ),
    query(
    `SELECT r.id, r.rating, r.comment, r.created_at, r.updated_at,
            r.user_id,
            CASE
              WHEN split_part(btrim(u.full_name), ' ', 1) LIKE '%@%' THEN 'Cliente'
              ELSE split_part(btrim(u.full_name), ' ', 1)
            END AS first_name,
            COUNT(v.user_id) FILTER (WHERE v.vote = 'like')::int AS like_count,
            COUNT(v.user_id) FILTER (WHERE v.vote = 'dislike')::int AS dislike_count,
            MAX(v.vote) FILTER (WHERE v.user_id = $2) AS user_vote
     FROM product_reviews r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN product_review_votes v ON v.review_id = r.id
     WHERE r.product_id = $1
     GROUP BY r.id, u.full_name
     ORDER BY r.updated_at DESC, r.id DESC
     LIMIT $3 OFFSET $4`,
      [productId, userId ?? null, limit, offset]
    ),
    query(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.updated_at,
              r.user_id,
              CASE
                WHEN split_part(btrim(u.full_name), ' ', 1) LIKE '%@%' THEN 'Cliente'
                ELSE split_part(btrim(u.full_name), ' ', 1)
              END AS first_name,
              COUNT(v.user_id) FILTER (WHERE v.vote = 'like')::int AS like_count,
              COUNT(v.user_id) FILTER (WHERE v.vote = 'dislike')::int AS dislike_count,
              MAX(v.vote) FILTER (WHERE v.user_id = $2) AS user_vote
       FROM product_reviews r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN product_review_votes v ON v.review_id = r.id
       WHERE r.product_id = $1 AND r.user_id = $2
       GROUP BY r.id, u.full_name`,
      [productId, userId ?? null]
    ),
  ]);
  const reviews = reviewsResult.rows.map((row) => ({
    id: Number(row.id),
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: { id: Number(row.user_id), name: row.first_name || 'Cliente' },
    isOwn: userId ? Number(row.user_id) === Number(userId) : false,
    likeCount: Number(row.like_count),
    dislikeCount: Number(row.dislike_count),
    userVote: row.user_vote || null,
  }));
  const ownRow = userId ? ownResult.rows[0] : null;
  const ownReview = ownRow ? {
    id: Number(ownRow.id),
    rating: Number(ownRow.rating),
    comment: ownRow.comment,
    createdAt: ownRow.created_at,
    updatedAt: ownRow.updated_at,
    user: { id: Number(ownRow.user_id), name: ownRow.first_name || 'Cliente' },
    isOwn: true,
    likeCount: Number(ownRow.like_count),
    dislikeCount: Number(ownRow.dislike_count),
    userVote: ownRow.user_vote || null,
  } : null;
  const count = Number(countResult.rows[0].count);
  const countsByRating = new Map(distributionResult.rows.map((row) => [Number(row.rating), Number(row.count)]));
  return {
    average: Number(countResult.rows[0].average),
    count,
    ownReview,
    items: reviews,
    distribution: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: countsByRating.get(rating) || 0 })),
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
}

async function saveReview(productId, userId, rating, comment) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const product = await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [productId]);
    if (!product.rows[0]) throw new ApiError(404, 'Produto não encontrado.');
    await client.query(
      `INSERT INTO product_reviews (product_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, user_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = now()`,
      [productId, userId, rating, comment]
    );
    if (!comment) {
      await client.query(
        `DELETE FROM product_review_votes
         WHERE review_id = (
           SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2
         )`,
        [productId, userId]
      );
    }
    await client.query(
      `UPDATE products
       SET rating = (SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) FROM product_reviews r WHERE r.product_id = $1),
           updated_at = now()
       WHERE id = $1`,
      [productId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getReviews(productId, userId);
}

async function deleteReview(productId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const product = await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [productId]);
    if (!product.rows[0]) throw new ApiError(404, 'Produto não encontrado.');
    const review = await client.query(
      'SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2 FOR UPDATE',
      [productId, userId]
    );
    if (!review.rows[0]) throw new ApiError(404, 'Avaliação não encontrada.');
    await client.query('DELETE FROM product_reviews WHERE id = $1', [review.rows[0].id]);
    await client.query(
      `UPDATE products
       SET rating = (SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) FROM product_reviews r WHERE r.product_id = $1),
           updated_at = now()
       WHERE id = $1`,
      [productId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getReviews(productId, userId);
}

async function setReviewVote(productId, reviewId, userId, vote) {
  const { rows } = await query(
    `SELECT user_id, comment
     FROM product_reviews
     WHERE id = $1 AND product_id = $2`,
    [reviewId, productId]
  );
  const review = rows[0];
  if (!review) throw new ApiError(404, 'Comentário não encontrado.');
  if (Number(review.user_id) === Number(userId)) {
    throw new ApiError(403, 'Não pode votar no seu próprio comentário.');
  }
  if (vote && !review.comment) {
    throw new ApiError(400, 'Só é possível votar em avaliações com comentário.');
  }

  if (vote) {
    await query(
      `INSERT INTO product_review_votes (review_id, user_id, vote)
       VALUES ($1, $2, $3)
       ON CONFLICT (review_id, user_id)
       DO UPDATE SET vote = EXCLUDED.vote, updated_at = now()`,
      [reviewId, userId, vote]
    );
  } else {
    await query(
      'DELETE FROM product_review_votes WHERE review_id = $1 AND user_id = $2',
      [reviewId, userId]
    );
  }

  const { rows: voteRows } = await query(
    `SELECT COUNT(*) FILTER (WHERE vote = 'like')::int AS like_count,
            COUNT(*) FILTER (WHERE vote = 'dislike')::int AS dislike_count,
            MAX(vote) FILTER (WHERE user_id = $2) AS user_vote
     FROM product_review_votes
     WHERE review_id = $1`,
    [reviewId, userId]
  );
  return {
    likeCount: Number(voteRows[0].like_count),
    dislikeCount: Number(voteRows[0].dislike_count),
    userVote: voteRows[0].user_vote || null,
  };
}

module.exports = {
  getPopular, getNewArrivals, getById, getAll, create, update, remove,
  getReviews, saveReview, deleteReview, setReviewVote,
};
