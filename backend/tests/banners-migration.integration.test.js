const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Pool } = require('pg');
const { assertIsolatedTestDatabase } = require('../test-support/assert-test-database');
const env = require('../src/config/env');
const { discoverMigrations, runMigrations } = require('../src/config/migration-runner');

const MIGRATION_FILENAME = '020_create_banners.sql';
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function createFixture(pool) {
  await pool.query(`
    CREATE TABLE categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(120) NOT NULL UNIQUE,
      icon_url TEXT,
      parent_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      image_url TEXT,
      image_urls TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      category_id INTEGER,
      rating NUMERIC(2,1) NOT NULL DEFAULT 0,
      is_popular BOOLEAN NOT NULL DEFAULT false,
      is_new_arrival BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const category = await pool.query(
    `INSERT INTO categories (name, slug) VALUES ('Categoria', 'categoria') RETURNING id`
  );
  const product = await pool.query(
    `INSERT INTO products (name, image_urls) VALUES ('Produto', ARRAY['/uploads/products/p.jpg']) RETURNING id`
  );
  return {
    categoryId: Number(category.rows[0].id),
    productId: Number(product.rows[0].id),
  };
}

async function tableExists(pool, tableName) {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_name = $1`,
    [tableName]
  );
  return rows.length === 1;
}

async function constraintNames(pool, tableName) {
  const { rows } = await pool.query(
    `SELECT conname FROM pg_constraint
     WHERE conrelid = $1::regclass ORDER BY conname`,
    [tableName]
  );
  return rows.map((row) => row.conname);
}

async function indexNames(pool, tableName) {
  const { rows } = await pool.query(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = current_schema() AND tablename = $1 ORDER BY indexname`,
    [tableName]
  );
  return rows.map((row) => row.indexname);
}

async function insertBanner(pool, fields) {
  const columns = Object.keys(fields);
  const values = Object.values(fields);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const result = await pool.query(
    `INSERT INTO banners (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    values
  );
  return Number(result.rows[0].id);
}

async function sqlError(promise) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
}

test('020 cria banners e banner_products com integridade, índices e rollback atómicos', async (t) => {
  assertIsolatedTestDatabase();

  const controlPool = new Pool({ ...env.db, options: '-c search_path=public' });
  let scopedPool;
  let temporaryMigrationsDir;
  let schema;

  try {
    await controlPool.query('SELECT 1');
    schema = `banners_020_${crypto.randomUUID().replaceAll('-', '')}`;
    await controlPool.query(`CREATE SCHEMA ${schema}`);

    const previousPgOptions = process.env.PGOPTIONS;
    process.env.PGOPTIONS = `-c search_path=${schema}`;
    t.after(() => {
      if (previousPgOptions === undefined) delete process.env.PGOPTIONS;
      else process.env.PGOPTIONS = previousPgOptions;
    });

    scopedPool = require('../src/config/db').pool;
    const { rows: connectionRows } = await scopedPool.query(
      'SELECT current_database() AS database_name, current_user AS database_user'
    );
    assert.equal(connectionRows[0].database_name, process.env.TEST_DB_NAME);
    assert.equal(connectionRows[0].database_user, process.env.TEST_DB_USER);

    await createFixture(scopedPool);
    const priorMigrations = discoverMigrations(MIGRATIONS_DIR)
      .filter((filename) => filename < MIGRATION_FILENAME);
    await scopedPool.query(
      `INSERT INTO schema_migrations (filename)
       SELECT unnest($1::text[]) ON CONFLICT (filename) DO NOTHING`,
      [priorMigrations]
    );

    const migrationSql = fs.readFileSync(
      path.join(MIGRATIONS_DIR, MIGRATION_FILENAME),
      'utf8'
    );
    temporaryMigrationsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'virtualshop-banners-020-'));
    fs.writeFileSync(
      path.join(temporaryMigrationsDir, MIGRATION_FILENAME),
      `${migrationSql}\nSELECT 1 / 0;\n`
    );

    const failure = await sqlError(runMigrations({
      pool: scopedPool,
      migrationsDir: temporaryMigrationsDir,
      args: ['--only', MIGRATION_FILENAME],
      logger: { log() {}, error() {} },
    }));
    assert.match(failure.message, /division by zero/);
    assert.equal(await tableExists(scopedPool, 'banners'), false, 'DDL inválido é revertido');
    assert.equal(await tableExists(scopedPool, 'banner_products'), false);
    const { rows: failedLedger } = await scopedPool.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [MIGRATION_FILENAME]
    );
    assert.equal(failedLedger.length, 0);

    const results = await runMigrations({
      pool: scopedPool,
      migrationsDir: MIGRATIONS_DIR,
      args: ['--only', MIGRATION_FILENAME],
      logger: { log() {}, error() {} },
    });
    assert.deepEqual(results, [{ filename: MIGRATION_FILENAME, applied: true }]);
    assert.equal(await tableExists(scopedPool, 'banners'), true);
    assert.equal(await tableExists(scopedPool, 'banner_products'), true);

    const bannerColumns = await scopedPool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'banners'`
    );
    const columnSet = new Set(bannerColumns.rows.map((row) => row.column_name));
    for (const column of [
      'id', 'name', 'title_pt', 'title_en', 'subtitle_pt', 'subtitle_en',
      'image_url', 'mobile_image_url', 'background_color', 'title_color',
      'subtitle_color', 'button_text_pt', 'button_text_en', 'button_color',
      'button_text_color', 'alignment', 'overlay_opacity', 'banner_type',
      'destination_type', 'product_id', 'category_id', 'destination_url',
      'starts_at', 'expires_at', 'is_active', 'sort_order', 'created_at', 'updated_at',
    ]) {
      assert.equal(columnSet.has(column), true, `coluna ${column} existe`);
    }

    const bannerConstraints = await constraintNames(scopedPool, 'banners');
    for (const constraint of [
      'banners_pkey', 'banners_name_key', 'banners_product_id_fkey',
      'banners_category_id_fkey', 'banners_destination_matches', 'banners_period_valid',
    ]) {
      assert.equal(bannerConstraints.includes(constraint), true, `constraint ${constraint} existe`);
    }
    const associationConstraints = await constraintNames(scopedPool, 'banner_products');
    for (const constraint of [
      'banner_products_pkey', 'banner_products_banner_id_fkey', 'banner_products_product_id_fkey',
    ]) {
      assert.equal(associationConstraints.includes(constraint), true, `constraint ${constraint} existe`);
    }

    const bannerIndexes = await indexNames(scopedPool, 'banners');
    for (const index of ['idx_banners_public_feed', 'idx_banners_schedule', 'idx_banners_product_id', 'idx_banners_category_id']) {
      assert.equal(bannerIndexes.includes(index), true, `índice ${index} existe`);
    }
    const associationIndexes = await indexNames(scopedPool, 'banner_products');
    for (const index of ['idx_banner_products_banner_order', 'idx_banner_products_product_id']) {
      assert.equal(associationIndexes.includes(index), true, `índice ${index} existe`);
    }

    const fixture = await createFixtureData(scopedPool);
    const bannerId = await insertBanner(scopedPool, {
      name: 'Banner de teste',
      title_pt: 'Título',
      image_url: '/uploads/banners/a.jpg',
      destination_type: 'product_list',
    });
    const { rows: defaults } = await scopedPool.query(
      'SELECT background_color, title_color, subtitle_color, alignment, overlay_opacity, is_active, sort_order FROM banners WHERE id = $1',
      [bannerId]
    );
    assert.equal(defaults[0].background_color, '#111827');
    assert.equal(defaults[0].title_color, '#FFFFFF');
    assert.equal(defaults[0].subtitle_color, '#E5E7EB');
    assert.equal(defaults[0].alignment, 'left');
    assert.equal(Number(defaults[0].overlay_opacity), 0);
    assert.equal(defaults[0].is_active, true);
    assert.equal(defaults[0].sort_order, 0);

    const invalidInsert = async (fields) => sqlError(insertBanner(scopedPool, fields));
    assert.equal((await invalidInsert({
      name: 'Cor inválida', title_pt: 'T', image_url: '/a.jpg', background_color: '#FFF',
    }))?.code, '23514');
    assert.equal((await invalidInsert({
      name: 'Opacidade inválida', title_pt: 'T', image_url: '/a.jpg', overlay_opacity: 1.5,
    }))?.code, '23514');
    assert.equal((await invalidInsert({
      name: 'Alinhamento inválido', title_pt: 'T', image_url: '/a.jpg', alignment: 'top',
    }))?.code, '23514');
    assert.equal((await invalidInsert({
      name: 'Período inválido', title_pt: 'T', image_url: '/a.jpg',
      starts_at: '2026-02-01T00:00:00Z', expires_at: '2026-01-01T00:00:00Z',
    }))?.code, '23514');
    assert.equal((await invalidInsert({
      name: 'Destante inválido', title_pt: 'T', image_url: '/a.jpg',
      destination_type: 'product', product_id: fixture.productId, category_id: fixture.categoryId,
    }))?.code, '23514');
    assert.equal((await invalidInsert({
      name: 'Banner de teste', title_pt: 'T', image_url: '/a.jpg',
    }))?.code, '23505');
    assert.equal((await invalidInsert({
      name: 'Produto inexistente', title_pt: 'T', image_url: '/a.jpg',
      destination_type: 'product', product_id: 999999,
    }))?.code, '23503');
    assert.equal((await invalidInsert({
      name: 'Categoria inexistente', title_pt: 'T', image_url: '/a.jpg',
      destination_type: 'category', category_id: 999999,
    }))?.code, '23503');

    const { rows: association } = await scopedPool.query(
      `INSERT INTO banner_products (banner_id, product_id, sort_order)
       VALUES ($1, $2, 3) RETURNING banner_id, product_id, sort_order`,
      [bannerId, fixture.productId]
    );
    assert.equal(Number(association[0].sort_order), 3);
    assert.equal((await sqlError(scopedPool.query(
      `INSERT INTO banner_products (banner_id, product_id) VALUES ($1, $2)`,
      [bannerId, 999999]
    )))?.code, '23503');
    assert.equal((await sqlError(scopedPool.query(
      `INSERT INTO banner_products (banner_id, product_id) VALUES ($1, $2)`,
      [bannerId, fixture.productId]
    )))?.code, '23505');
    assert.equal((await sqlError(scopedPool.query(
      'DELETE FROM products WHERE id = $1', [fixture.productId]
    )))?.code, '23503');

    await scopedPool.query('DELETE FROM banners WHERE id = $1', [bannerId]);
    const { rows: remaining } = await scopedPool.query(
      'SELECT 1 FROM banner_products WHERE banner_id = $1', [bannerId]
    );
    assert.equal(remaining.length, 0, 'ON DELETE CASCADE remove as associações');

    const categoryBannerId = await insertBanner(scopedPool, {
      name: 'Banner de categoria', title_pt: 'T', image_url: '/a.jpg',
      destination_type: 'category', category_id: fixture.categoryId,
    });
    assert.equal((await sqlError(scopedPool.query(
      'DELETE FROM categories WHERE id = $1', [fixture.categoryId]
    )))?.code, '23503');
    await scopedPool.query('DELETE FROM banners WHERE id = $1', [categoryBannerId]);

    const rerun = await runMigrations({
      pool: scopedPool,
      migrationsDir: MIGRATIONS_DIR,
      args: ['--only', MIGRATION_FILENAME],
      logger: { log() {}, error() {} },
    });
    assert.deepEqual(rerun, [{ filename: MIGRATION_FILENAME, applied: false }]);
  } finally {
    if (scopedPool) await scopedPool.end();
    await controlPool.end();
    if (temporaryMigrationsDir) fs.rmSync(temporaryMigrationsDir, { recursive: true, force: true });
    if (schema) {
      const cleanupPool = new Pool({ ...env.db, options: '-c search_path=public' });
      try {
        await cleanupPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      } finally {
        await cleanupPool.end();
      }
    }
  }
});

async function createFixtureData(pool) {
  const category = await pool.query(
    `INSERT INTO categories (name, slug) VALUES ('Categoria unique', 'categoria-unique') RETURNING id`
  );
  const product = await pool.query(
    `INSERT INTO products (name, image_urls) VALUES ('Produto unique', ARRAY['/uploads/products/p.jpg']) RETURNING id`
  );
  return {
    categoryId: Number(category.rows[0].id),
    productId: Number(product.rows[0].id),
  };
}
