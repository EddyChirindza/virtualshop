const test = require('node:test');
const assert = require('node:assert/strict');

const calls = [];
let storedProduct;
const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      if (sql.startsWith('INSERT INTO products')) {
        storedProduct = { id: 17, image_url: params[4], image_urls: params[5] };
        return { rows: [{ id: storedProduct.id }] };
      }
      if (sql.startsWith('UPDATE products')) {
        const imageUrlsIndex = sql.indexOf('image_urls =');
        if (imageUrlsIndex !== -1) {
          const paramIndex = Number(sql.slice(imageUrlsIndex).match(/image_urls = \$(\d+)/)[1]) - 1;
          storedProduct.image_urls = params[paramIndex];
          storedProduct.image_url = storedProduct.image_urls[0] ?? null;
        }
        return { rows: [{ id: storedProduct.id }] };
      }
      if (sql.includes('FROM products p') && sql.includes('WHERE p.id =')) {
        return { rows: [{
          id: storedProduct.id,
          name: 'Produto teste',
          price: '25.00',
          stock: 4,
          image_url: storedProduct.image_url,
          image_urls: storedProduct.image_urls,
        }] };
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    },
  },
};

const productService = require('../src/modules/products/product.service');
const { productCreateSchema, productUpdateSchema } = require('../src/modules/products/product.validators');

test('product API validates multiple images and rejects invalid entries', () => {
  assert.deepEqual(productCreateSchema.parse({
    name: 'Produto', price: '25', image_urls: ['/one.jpg', '/two.jpg'],
  }).image_urls, ['/one.jpg', '/two.jpg']);
  assert.equal(productCreateSchema.safeParse({
    name: 'Produto', price: '25', image_urls: ['/one.jpg', ''],
  }).success, false);
  assert.equal(productUpdateSchema.safeParse({
    image_urls: Array.from({ length: 21 }, (_, index) => `/image-${index}.jpg`),
  }).success, false);
});

test('create and update persist all images and keep image_url as a legacy fallback', async () => {
  calls.length = 0;
  const images = ['/one.jpg', '/two.jpg', '/three.jpg'];
  const created = await productService.create({
    name: 'Produto teste', price: 25, image_urls: images,
  });

  const insert = calls.find((call) => call.sql.startsWith('INSERT INTO products'));
  assert.equal(insert.params[4], images[0]);
  assert.deepEqual(insert.params[5], images);
  assert.deepEqual(created.image_urls, images);
  assert.equal(created.image_url, images[0]);

  calls.length = 0;
  const updated = await productService.update(17, { image_urls: ['/new.jpg', '/other.jpg'] });
  const update = calls.find((call) => call.sql.startsWith('UPDATE products'));
  assert.match(update.sql, /image_urls = \$\d+/);
  assert.deepEqual(updated.image_urls, ['/new.jpg', '/other.jpg']);
  assert.equal(updated.image_url, '/new.jpg');
});

test('legacy single-image create still produces a one-image list', async () => {
  const created = await productService.create({
    name: 'Produto legado', price: 10, image_url: '/legacy.jpg',
  });
  assert.equal(created.image_url, '/legacy.jpg');
  assert.deepEqual(created.image_urls, ['/legacy.jpg']);
});
