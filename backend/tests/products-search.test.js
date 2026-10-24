const test = require('node:test');
const assert = require('node:assert/strict');

const { productListSchema } = require('../src/modules/products/product.validators');

test('product list query trims q and accepts supported filters', () => {
  const params = productListSchema.parse({
    q: '  maçã  ',
    category: '2',
    minPrice: '10.50',
    maxPrice: '100',
    page: '2',
    limit: '10',
    sort: 'price_asc',
  });

  assert.equal(params.q, 'maçã');
  assert.equal(params.category, 2);
  assert.equal(params.minPrice, 10.5);
  assert.equal(params.maxPrice, 100);
  assert.equal(params.page, 2);
  assert.equal(params.limit, 10);
});

test('product list query rejects invalid search parameters with clear messages', () => {
  const invalidQueries = [
    [{ q: 'x'.repeat(101) }, /q não pode ter mais de 100 caracteres/],
    [{ limit: '1000' }, /limit não pode ser superior a 50/],
    [{ sort: 'random' }, /sort deve ser relevance, price_asc, price_desc ou newest/],
    [{ minPrice: '20', maxPrice: '10' }, /minPrice não pode ser superior a maxPrice/],
    [{ minPrice: '-1' }, /minPrice não pode ser negativo/],
  ];

  for (const [queryParams, expectedMessage] of invalidQueries) {
    assert.throws(
      () => productListSchema.parse(queryParams),
      (error) => expectedMessage.test(error.errors[0].message)
    );
  }
});

test('product search escapes LIKE wildcards and binds all user input', async () => {
  const calls = [];
  const dbPath = require.resolve('../src/config/db');
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async (sql, params) => {
        calls.push({ sql, params });
        return calls.length === 1
          ? { rows: [{ total: 1 }] }
          : { rows: [{ id: 7, name: '100% natural', price: '12.00' }] };
      },
    },
  };

  const productService = require('../src/modules/products/product.service');
  const result = await productService.getAll({
    q: '100%_',
    categoryId: 3,
    minPrice: 5,
    maxPrice: 50,
    page: 1,
    limit: 20,
  });

  assert.equal(result.total, 1);
  assert.equal(result.totalPages, 1);
  assert.equal(result.data[0].name, '100% natural');
  assert.match(calls[1].sql, /WITH RECURSIVE category_tree/);
  assert.match(calls[1].sql, /CASE WHEN p\.name ILIKE \$2.*WHEN p\.name ILIKE \$3/s);
  assert.match(calls[1].sql, /p\.price >= \$4/);
  assert.match(calls[1].sql, /p\.price <= \$5/);
  assert.equal(calls[1].sql.includes('100%_'), false);
  assert.deepEqual(calls[1].params.slice(0, 5), [3, '100\\%\\_%', '%100\\%\\_%', 5, 50]);
  assert.deepEqual(calls[1].params.slice(-2), [20, 0]);
});