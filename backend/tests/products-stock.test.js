const test = require('node:test');
const assert = require('node:assert/strict');

const calls = [];
let storedProduct = { id: 1, stock: 0 };

const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      if (sql.startsWith('INSERT INTO products')) {
        storedProduct = { id: 1, stock: Number(params[3]) };
        return { rows: [{ id: storedProduct.id }] };
      }
      if (sql.startsWith('UPDATE products')) {
        const stockMatch = sql.match(/stock = \$(\d+)/);
        if (stockMatch) {
          storedProduct.stock = Number(params[Number(stockMatch[1]) - 1]);
        }
        return { rows: [{ id: storedProduct.id }] };
      }
      if (sql.startsWith('SELECT stock FROM products')) {
        return { rows: [{ stock: storedProduct.stock }] };
      }
      if (sql.includes('FROM products p') && sql.includes('WHERE p.id =')) {
        return { rows: [{
          id: storedProduct.id,
          name: 'Produto',
          price: '10.00',
          stock: storedProduct.stock,
          image_url: null,
          image_urls: [],
        }] };
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    },
  },
};

const productService = require('../src/modules/products/product.service');
const { productCreateSchema } = require('../src/modules/products/product.validators');

test('stock validation accepts only non-negative integers', () => {
  assert.equal(productCreateSchema.parse({ name: 'Produto', price: 10, stock: '0' }).stock, 0);
  assert.equal(productCreateSchema.parse({ name: 'Produto', price: 10, stock: '6' }).stock, 6);
  assert.equal(productCreateSchema.safeParse({ name: 'Produto', price: 10, stock: -1 }).success, false);
  assert.equal(productCreateSchema.safeParse({ name: 'Produto', price: 10, stock: '1.5' }).success, false);
});

test('create uses the numeric stock even when a legacy status is also sent', async () => {
  calls.length = 0;
  const created = await productService.create({
    name: 'Produto',
    price: 10,
    stock: 8,
    stock_status: 'out_of_stock',
  });

  const insert = calls.find((call) => call.sql.startsWith('INSERT INTO products'));
  assert.equal(insert.params[3], 8);
  assert.equal(created.stock, 8);
});

test('create still maps a legacy status when stock is absent', async () => {
  calls.length = 0;
  const created = await productService.create({
    name: 'Produto',
    price: 10,
    stock_status: 'low_stock',
  });

  const insert = calls.find((call) => call.sql.startsWith('INSERT INTO products'));
  assert.equal(insert.params[3], 5);
  assert.equal(created.stock, 5);
});

test('update writes the numeric stock without consulting the legacy status', async () => {
  calls.length = 0;
  storedProduct = { id: 1, stock: 2 };

  const updated = await productService.update(1, {
    stock: 12,
    stock_status: 'out_of_stock',
  });

  assert.equal(calls.some((call) => call.sql.startsWith('SELECT stock FROM products')), false);
  const update = calls.find((call) => call.sql.startsWith('UPDATE products'));
  assert.match(update.sql, /stock = \$1/);
  assert.equal(update.params[0], 12);
  assert.equal(updated.stock, 12);
});

test('update still maps a legacy status when stock is absent', async () => {
  calls.length = 0;
  storedProduct = { id: 1, stock: 3 };

  const updated = await productService.update(1, { stock_status: 'low_stock' });

  const update = calls.find((call) => call.sql.startsWith('UPDATE products'));
  assert.match(update.sql, /stock = \$1/);
  assert.equal(update.params[0], 3);
  assert.equal(updated.stock, 3);
});
