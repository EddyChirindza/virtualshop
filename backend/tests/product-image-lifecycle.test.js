const test = require('node:test');
const assert = require('node:assert/strict');

const calls = [];
const released = [];
let failDelete = false;
const products = new Map([
  [1, {
    id: 1,
    name: 'Produto',
    description: null,
    price: '10.00',
    stock: 3,
    image_url: '/uploads/products/old.jpg',
    image_urls: ['/uploads/products/old.jpg', '/uploads/products/shared.jpg'],
    rating: 0,
    is_popular: false,
    is_new_arrival: true,
    category_id: null,
    category_name: null,
  }],
  [2, {
    id: 2,
    name: 'Produto apagado',
    description: null,
    price: '20.00',
    stock: 1,
    image_url: '/uploads/products/delete-a.jpg',
    image_urls: ['/uploads/products/delete-a.jpg', '/uploads/products/delete-b.jpg'],
    rating: 0,
    is_popular: false,
    is_new_arrival: false,
    category_id: null,
    category_name: null,
  }],
  [3, {
    id: 3,
    name: 'Produto bloqueado',
    description: null,
    price: '30.00',
    stock: 1,
    image_url: '/uploads/products/locked.jpg',
    image_urls: ['/uploads/products/locked.jpg'],
    rating: 0,
    is_popular: false,
    is_new_arrival: false,
    category_id: null,
    category_name: null,
  }],
]);

const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params = []) => {
      calls.push({ sql, params });

      if (sql.includes('FROM products p') && sql.includes('WHERE p.id = $1')) {
        const product = products.get(Number(params[0]));
        return { rows: product ? [{ ...product }] : [] };
      }

      if (sql.startsWith('UPDATE products')) {
        const product = products.get(Number(params[params.length - 1]));
        const assignments = sql.matchAll(/([a-z_]+) = \$(\d+)/g);
        for (const [, column, index] of assignments) {
          product[column] = params[Number(index) - 1];
        }
        return { rows: [{ id: product.id }] };
      }

      if (sql.startsWith('DELETE FROM products')) {
        if (failDelete) {
          const error = new Error('foreign key');
          error.code = '23503';
          throw error;
        }
        const id = Number(params[0]);
        const existed = products.delete(id);
        return { rows: existed ? [{ id }] : [] };
      }

      throw new Error(`Query inesperada no teste: ${sql}`);
    },
  },
};

const uploadServicePath = require.resolve('../src/services/upload_files.service');
require.cache[uploadServicePath] = {
  id: uploadServicePath,
  filename: uploadServicePath,
  loaded: true,
  exports: {
    removeUnreferencedUploadsSafely: async (urls) => {
      released.push([...urls]);
      return urls;
    },
  },
};

const productService = require('../src/modules/products/product.service');

test('update liberta as imagens antigas depois de guardar as novas', async () => {
  released.length = 0;
  calls.length = 0;

  await productService.update(1, {
    image_urls: ['/uploads/products/new.jpg'],
  });

  assert.deepEqual(released, [[
    '/uploads/products/old.jpg',
    '/uploads/products/shared.jpg',
  ]]);
  assert.deepEqual(products.get(1).image_urls, ['/uploads/products/new.jpg']);
});

test('update sem alterações de imagem não tenta apagar uploads', async () => {
  released.length = 0;

  await productService.update(1, { stock: 7 });

  assert.deepEqual(released, []);
});

test('remove liberta as imagens depois de apagar o produto', async () => {
  released.length = 0;
  failDelete = false;

  await productService.remove(2);

  assert.equal(products.has(2), false);
  assert.deepEqual(released, [[
    '/uploads/products/delete-a.jpg',
    '/uploads/products/delete-b.jpg',
  ]]);
});

test('remove não apaga imagens quando a base de dados rejeita o produto', async () => {
  released.length = 0;
  failDelete = true;

  await assert.rejects(
    () => productService.remove(3),
    (err) => {
      assert.equal(err.statusCode, 409);
      return true;
    }
  );

  assert.equal(products.has(3), true);
  assert.deepEqual(released, []);
});
