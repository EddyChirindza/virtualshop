const { query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');

function normalizeProduct(row) {
  return {
    id: row.product_id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    stock: Number(row.stock),
    image: row.image_url,
    categoryName: row.category_name || null,
  };
}

async function addFavorite(userId, productId) {
  const product = await query('SELECT id FROM products WHERE id = $1', [productId]);

  if (!product.rows[0]) {
    throw new ApiError(404, 'Produto não encontrado.');
  }

  try {
    const { rows } = await query(
      `INSERT INTO favorites (user_id, product_id)
       VALUES ($1, $2)
       RETURNING id, user_id, product_id, created_at`,
      [userId, productId]
    );

    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new ApiError(409, 'Este produto já está nos teus favoritos.', 'FAVORITE_ALREADY_EXISTS');
    }
    throw err;
  }
}

async function removeFavorite(userId, productId) {
  const { rowCount } = await query(
    'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );

  if (rowCount === 0) {
    throw new ApiError(404, 'Favorito não encontrado.');
  }

  return { deleted: true };
}

async function listFavorites(userId, { page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;

  const { rows } = await query(
    `SELECT f.id AS favorite_id,
            f.product_id,
            p.name,
            p.description,
            p.price,
            p.stock,
            p.image_url,
            c.name AS category_name
     FROM favorites f
     JOIN products p ON p.id = f.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset]
  );

  return rows.map((row) => ({
    id: row.favorite_id,
    productId: row.product_id,
    createdAt: row.created_at,
    product: normalizeProduct(row),
  }));
}

async function isFavorite(userId, productId) {
  const { rows } = await query(
    `SELECT EXISTS (
       SELECT 1 FROM favorites WHERE user_id = $1 AND product_id = $2
     ) AS is_favorite`,
    [userId, productId]
  );

  return Boolean(rows[0]?.is_favorite);
}

module.exports = { addFavorite, removeFavorite, listFavorites, isFavorite };
