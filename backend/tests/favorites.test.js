const test = require('node:test');
const assert = require('node:assert/strict');

const { query } = require('../src/config/db');
const favoritesService = require('../src/modules/favorites/favorites.service');

async function resetDb() {
  await query('DELETE FROM favorites');
  await query('DELETE FROM products');
  await query('DELETE FROM categories');
  await query('DELETE FROM users');

  const { rows: categoryRows } = await query(
    `INSERT INTO categories (name, slug)
     VALUES ('Teste', 'teste')
     RETURNING id`
  );

  const { rows: userRows } = await query(
    `INSERT INTO users (full_name, phone, email, password_hash, role)
     VALUES ('User Favorite', '+351900000099', 'favorites.user@example.com', 'unused', 'customer')
     RETURNING id`
  );

  const categoryId = categoryRows[0].id;
  const userId = userRows[0].id;

  const productRows = [];
  for (const [name, price, stock] of [
    ['Produto A', 120.50, 10],
    ['Produto B', 250.00, 8],
    ['Produto C', 90.00, 12],
    ['Produto D', 330.75, 5],
  ]) {
    const { rows } = await query(
      `INSERT INTO products (name, description, price, stock, image_url, category_id, rating, is_popular, is_new_arrival)
       VALUES ($1, 'Produto de teste', $2, $3, 'https://example.com/image.jpg', $4, 4.5, true, true)
       RETURNING id`,
      [name, price, stock, categoryId]
    );
    productRows.push(rows[0].id);
  }

  return { userId, products: productRows };
}

test('adicionar favorito', async () => {
  const { userId, products } = await resetDb();
  const result = await favoritesService.addFavorite(userId, products[0]);

  assert.equal(result.user_id, userId);
  assert.equal(result.product_id, products[0]);
});

test('adicionar favorito duplicado devolve 409', async () => {
  const { userId, products } = await resetDb();

  await favoritesService.addFavorite(userId, products[0]);

  await assert.rejects(
    () => favoritesService.addFavorite(userId, products[0]),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'FAVORITE_ALREADY_EXISTS');
      return true;
    }
  );
});

test('adicionar favorito com produto inexistente devolve 404', async () => {
  const { userId } = await resetDb();

  await assert.rejects(
    () => favoritesService.addFavorite(userId, 999999),
    (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    }
  );
});

test('remover favorito', async () => {
  const { userId, products } = await resetDb();
  await favoritesService.addFavorite(userId, products[0]);

  const result = await favoritesService.removeFavorite(userId, products[0]);
  assert.equal(result.deleted, true);
});

test('remover favorito inexistente devolve 404', async () => {
  const { userId, products } = await resetDb();

  await assert.rejects(
    () => favoritesService.removeFavorite(userId, products[0]),
    (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    }
  );
});

test('listar favoritos com paginação', async () => {
  const { userId, products } = await resetDb();
  await favoritesService.addFavorite(userId, products[0]);
  await favoritesService.addFavorite(userId, products[1]);
  await favoritesService.addFavorite(userId, products[2]);

  const result = await favoritesService.listFavorites(userId, { page: 1, pageSize: 2 });

  assert.equal(result.length, 2);
  assert.equal(result[0].productId, products[2]);
});

test('listar favoritos vazio', async () => {
  const { userId } = await resetDb();
  const result = await favoritesService.listFavorites(userId, { page: 1, pageSize: 10 });
  assert.deepEqual(result, []);
});
