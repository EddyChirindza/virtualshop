const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { Pool } = require('pg');
const { assertIsolatedTestDatabase } = require('../test-support/assert-test-database');
const env = require('../src/config/env');
const { discoverMigrations, runMigrations } = require('../src/config/migration-runner');

const MIGRATION_FILENAME = '020_create_banners.sql';
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

let service;
let productService;
let categoryService;
let scopedPool;
let controlPool;
let schema;
let previousPgOptions;
let fixture;

test('serviço de banners usa PostgreSQL real para CRUD, publicação e destinos', async (t) => {
  assertIsolatedTestDatabase();
  controlPool = new Pool({ ...env.db, options: '-c search_path=public' });
  schema = `banners_service_${crypto.randomUUID().replaceAll('-', '')}`;
  await controlPool.query(`CREATE SCHEMA ${schema}`);

  previousPgOptions = process.env.PGOPTIONS;
  process.env.PGOPTIONS = `-c search_path=${schema}`;
  t.after(async () => {
    if (previousPgOptions === undefined) delete process.env.PGOPTIONS;
    else process.env.PGOPTIONS = previousPgOptions;
  });

  scopedPool = require('../src/config/db').pool;
  await createFixture(scopedPool);
  const priorMigrations = discoverMigrations(MIGRATIONS_DIR)
    .filter((filename) => filename < MIGRATION_FILENAME);
  await scopedPool.query(
    `INSERT INTO schema_migrations (filename)
     SELECT unnest($1::text[]) ON CONFLICT (filename) DO NOTHING`,
    [priorMigrations]
  );
  await runMigrations({
    pool: scopedPool,
    migrationsDir: MIGRATIONS_DIR,
    args: ['--only', MIGRATION_FILENAME],
    logger: { log() {}, error() {} },
  });

  service = require('../src/modules/banners/banner.service');
  productService = require('../src/modules/products/product.service');
  categoryService = require('../src/modules/categories/category.service');
  fixture = await seedData();

  t.after(async () => {
    if (scopedPool) await scopedPool.end();
    if (controlPool) await controlPool.end();
    if (schema) {
      const cleanupPool = new Pool({ ...env.db, options: '-c search_path=public' });
      try {
        await cleanupPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      } finally {
        await cleanupPool.end();
      }
    }
  });

  await t.test('CRUD administrativo, nome duplicado, atualização parcial e eliminação', async () => {
    const created = await service.create({
      name: 'Banner CRUD',
      title_pt: 'Título',
      title_en: 'Title',
      image_url: '/uploads/banners/crud.jpg',
      sort_order: 2,
    });
    assert.equal(created.name, 'Banner CRUD');
    assert.equal(created.is_active, true);
    assert.equal(created.sort_order, 2);
    assert.deepEqual(created.products, []);

    const listed = await service.listAdmin({ page: 1, limit: 50 });
    assert.ok(listed.items.some((item) => item.id === created.id));
    assert.ok(listed.total >= 1);

    const detail = await service.getAdminById(created.id);
    assert.equal(detail.title_en, 'Title');

    const updated = await service.update(created.id, {
      is_active: false,
      sort_order: 7,
      subtitle_pt: 'Subtítulo',
    });
    assert.equal(updated.is_active, false);
    assert.equal(updated.sort_order, 7);
    assert.equal(updated.subtitle_pt, 'Subtítulo');
    assert.equal(updated.title_pt, 'Título', 'update parcial preserva os restantes campos');

    const afterReactivation = await service.update(created.id, { is_active: true });
    assert.equal(afterReactivation.is_active, true);
    assert.equal(afterReactivation.sort_order, 7);

    await assert.rejects(
      () => service.create({
        name: 'Banner CRUD', title_pt: 'Outro', image_url: '/uploads/banners/other.jpg',
      }),
      (error) => error.statusCode === 409 && /nome/.test(error.message)
    );
    await assert.rejects(
      () => service.getAdminById(999999),
      (error) => error.statusCode === 404
    );
    await assert.rejects(
      () => service.update(999999, { is_active: false }),
      (error) => error.statusCode === 404
    );

    const removed = await service.remove(created.id);
    assert.equal(removed.id, created.id);
    await assert.rejects(() => service.getAdminById(created.id), (error) => error.statusCode === 404);
  });

  await t.test('publicação respeita estado, agendamento e ordenação determinística', async () => {
    const now = Date.now();
    const iso = (offsetMs) => new Date(now + offsetMs).toISOString();
    const makeBanner = (suffix, fields) => service.create({
      name: `Banner publicação ${suffix}`,
      title_pt: `Título ${suffix}`,
      image_url: `/uploads/banners/${suffix}.jpg`,
      ...fields,
    });

    const active = await makeBanner('active', { sort_order: 5 });
    const inactive = await makeBanner('inactive', { is_active: false, sort_order: 0 });
    const future = await makeBanner('future', { starts_at: iso(60 * 60 * 1000), sort_order: 1 });
    const inside = await makeBanner('inside', {
      starts_at: iso(-60 * 60 * 1000), expires_at: iso(60 * 60 * 1000), sort_order: 5,
    });
    const expired = await makeBanner('expired', { expires_at: iso(-60 * 60 * 1000), sort_order: 0 });
    const futureExpiry = await makeBanner('future-expiry', { expires_at: iso(60 * 1000), sort_order: -2 });
    const exactExpiry = await makeBanner('exact-expiry', { expires_at: iso(-1), sort_order: 8 });

    const publicIds = (await service.getPublic()).items.map((item) => item.id);
    assert.ok(publicIds.includes(active.id), 'ativo sem datas aparece');
    assert.equal(publicIds.includes(inactive.id), false, 'desativado não aparece');
    assert.equal(publicIds.includes(future.id), false, 'agendado no futuro não aparece');
    assert.ok(publicIds.includes(inside.id), 'dentro do período aparece');
    assert.equal(publicIds.includes(expired.id), false, 'expirado não aparece');
    assert.ok(publicIds.includes(futureExpiry.id), 'ainda não expirado aparece');
    assert.equal(publicIds.includes(exactExpiry.id), false, 'expiração no instante atual não aparece');

    const expectedOrder = [futureExpiry.id, active.id, inside.id];
    const ordered = publicIds.filter((id) => expectedOrder.includes(id));
    assert.deepEqual(ordered, expectedOrder, 'ordenação por sort_order e id');

    const nextSecond = new Date(now + 1500).toISOString();
    const startsNow = await makeBanner('starts-now', { starts_at: nextSecond });
    assert.equal((await service.getPublic()).items.some((item) => item.id === startsNow.id), false);
    await scopedPool.query(
      'UPDATE banners SET starts_at = now() - interval \'1 second\' WHERE id = $1',
      [startsNow.id]
    );
    assert.ok((await service.getPublic()).items.some((item) => item.id === startsNow.id));
  });

  await t.test('destinos estruturados com produto, categoria, URL e lista de produtos', async () => {
    const product = await service.create({
      name: 'Banner destino produto',
      title_pt: 'Produto',
      image_url: '/uploads/banners/product.jpg',
      destination_type: 'product',
      product_id: fixture.productIds[0],
      sort_order: 10,
    });
    const category = await service.create({
      name: 'Banner destino categoria',
      title_pt: 'Categoria',
      image_url: '/uploads/banners/category.jpg',
      destination_type: 'category',
      category_id: fixture.categoryId,
      sort_order: 11,
    });
    const url = await service.create({
      name: 'Banner destino URL',
      title_pt: 'URL',
      image_url: '/uploads/banners/url.jpg',
      destination_type: 'url',
      destination_url: '/promocoes/verao',
      sort_order: 12,
    });
    const none = await service.create({
      name: 'Banner destino nenhum',
      title_pt: 'Nenhum',
      image_url: '/uploads/banners/none.jpg',
      sort_order: 13,
    });
    const list = await service.create({
      name: 'Banner destino lista',
      title_pt: 'Lista',
      image_url: '/uploads/banners/list.jpg',
      mobile_image_url: '/uploads/banners/list-mobile.jpg',
      destination_type: 'product_list',
      products: [
        { product_id: fixture.productIds[2], sort_order: 0 },
        { product_id: fixture.productIds[1], sort_order: 1 },
      ],
      sort_order: 14,
    });

    const items = (await service.getPublic()).items;
    const byId = new Map(items.map((item) => [item.id, item]));

    assert.deepEqual(byId.get(product.id).destination, {
      type: 'product',
      product: {
        id: fixture.productIds[0],
        name: 'Produto 0',
        price: 10,
        image_url: '/uploads/products/0.jpg',
        image_urls: ['/uploads/products/0.jpg'],
        category_id: fixture.categoryId,
        category_name: 'Categoria de teste',
      },
    });
    assert.equal(byId.get(category.id).destination.type, 'category');
    assert.equal(byId.get(category.id).destination.category.id, fixture.categoryId);
    assert.equal(byId.get(url.id).destination.url, '/promocoes/verao');
    assert.deepEqual(byId.get(none.id).destination, { type: 'none' });
    assert.equal(byId.get(list.id).destination.type, 'product_list');
    assert.deepEqual(
      byId.get(list.id).destination.products.map((item) => item.id),
      [fixture.productIds[2], fixture.productIds[1]]
    );
    assert.equal(byId.get(list.id).mobile_image_url, '/uploads/banners/list-mobile.jpg');
    assert.equal(byId.get(none.id).mobile_image_url, '/uploads/banners/none.jpg', 'fallback da imagem mobile');
    assert.deepEqual(byId.get(list.id).title, { pt: 'Lista', en: null });
    assert.deepEqual(byId.get(list.id).style, {
      background_color: '#111827',
      title_color: '#FFFFFF',
      subtitle_color: '#E5E7EB',
      button_color: null,
      button_text_color: null,
      alignment: 'left',
      overlay_opacity: 0,
    });
    assert.equal(Object.hasOwn(byId.get(list.id), 'name'), false, 'nome interno não é exposto');

    const changed = await service.update(list.id, { destination_type: 'none' });
    assert.equal(changed.destination_type, 'none');
    assert.deepEqual(changed.products, [], 'associações antigas são removidas ao mudar de destino');
    const { rows: leftover } = await scopedPool.query(
      'SELECT 1 FROM banner_products WHERE banner_id = $1', [list.id]
    );
    assert.equal(leftover.length, 0);
  });

  await t.test('associações de produtos são transacionais, ordenadas e validadas', async () => {
    const banner = await service.create({
      name: 'Banner associações',
      title_pt: 'Associações',
      image_url: '/uploads/banners/assoc.jpg',
      destination_type: 'product_list',
      products: [
        { product_id: fixture.productIds[0], sort_order: 2 },
        { product_id: fixture.productIds[1], sort_order: 0 },
        { product_id: fixture.productIds[2], sort_order: 1 },
      ],
    });
    assert.deepEqual(
      banner.products.map((item) => item.product_id),
      [fixture.productIds[1], fixture.productIds[2], fixture.productIds[0]]
    );

    const reordered = await service.update(banner.id, {
      products: [
        { product_id: fixture.productIds[0], sort_order: 0 },
        { product_id: fixture.productIds[2], sort_order: 1 },
      ],
    });
    assert.deepEqual(
      reordered.products.map((item) => item.product_id),
      [fixture.productIds[0], fixture.productIds[2]]
    );

    await assert.rejects(
      () => service.update(banner.id, { products: [{ product_id: 999999 }] }),
      (error) => error.statusCode === 400
    );
    await assert.rejects(
      () => service.update(banner.id, {
        products: [{ product_id: fixture.productIds[0] }, { product_id: fixture.productIds[0] }],
      }),
      (error) => error.name === 'ZodError' || error.statusCode === 400
    );
    await assert.rejects(
      () => service.update(banner.id, { products: [] }),
      (error) => /pelo menos um produto/.test(error.message)
    );
    assert.deepEqual(
      (await service.getAdminById(banner.id)).products.map((item) => item.product_id),
      [fixture.productIds[0], fixture.productIds[2]],
      'update falhado não deixa o banner parcialmente atualizado'
    );

    const inactive = await service.update(banner.id, { is_active: false });
    assert.equal(inactive.is_active, false);
    const emptied = await service.update(banner.id, { products: [] });
    assert.deepEqual(emptied.products, []);
    await assert.rejects(
      () => service.update(banner.id, { is_active: true }),
      (error) => error.name === 'ZodError' || error.statusCode === 400
    );

    await service.remove(banner.id);
    const { rows } = await scopedPool.query(
      'SELECT 1 FROM banner_products WHERE banner_id = $1', [banner.id]
    );
    assert.equal(rows.length, 0, 'eliminação do banner remove associações');
  });

  await t.test('eliminação de produto/categoria referenciada devolve 409', async () => {
    const productBanner = await service.create({
      name: 'Banner bloqueio produto',
      title_pt: 'Bloqueio',
      image_url: '/uploads/banners/block.jpg',
      destination_type: 'product',
      product_id: fixture.productIds[3],
    });
    await assert.rejects(
      () => productService.remove(fixture.productIds[3]),
      (error) => error.statusCode === 409 && /banner/.test(error.message)
    );
    await service.remove(productBanner.id);
    await productService.remove(fixture.productIds[3]);

    const listBanner = await service.create({
      name: 'Banner bloqueio lista',
      title_pt: 'Bloqueio lista',
      image_url: '/uploads/banners/block-list.jpg',
      destination_type: 'product_list',
      products: [{ product_id: fixture.productIds[1] }],
    });
    await assert.rejects(
      () => productService.remove(fixture.productIds[1]),
      (error) => error.statusCode === 409 && /banner/.test(error.message)
    );
    await service.remove(listBanner.id);

    const otherCategoryResult = await scopedPool.query(
      `INSERT INTO categories (name, slug) VALUES ('Categoria bloqueada', 'categoria-bloqueada') RETURNING id`
    );
    const otherCategoryId = Number(otherCategoryResult.rows[0].id);
    const categoryBanner = await service.create({
      name: 'Banner bloqueio categoria',
      title_pt: 'Bloqueio categoria',
      image_url: '/uploads/banners/block-category.jpg',
      destination_type: 'category',
      category_id: otherCategoryId,
    });
    await assert.rejects(
      () => categoryService.remove(otherCategoryId),
      (error) => error.statusCode === 409 && /banner/.test(error.message)
    );
    await service.remove(categoryBanner.id);
    await categoryService.remove(otherCategoryId);

    const freeCategory = await scopedPool.query(
      `INSERT INTO categories (name, slug) VALUES ('Sem banner', 'sem-banner') RETURNING id`
    );
    await categoryService.remove(Number(freeCategory.rows[0].id));
  });
});

async function createFixture(pool) {
  await pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      avatar_url TEXT
    );
    CREATE TABLE categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(120) NOT NULL UNIQUE,
      icon_url TEXT,
      parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
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
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
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
}

async function seedData() {
  const category = await scopedPool.query(
    `INSERT INTO categories (name, slug) VALUES ('Categoria de teste', 'categoria-teste') RETURNING id`
  );
  const categoryId = Number(category.rows[0].id);
  const productIds = [];
  for (let index = 0; index < 4; index += 1) {
    const result = await scopedPool.query(
      `INSERT INTO products (name, price, image_url, image_urls, category_id)
       VALUES ($1, $2, $3, ARRAY[$3], $4) RETURNING id`,
      [`Produto ${index}`, 10 + index, `/uploads/products/${index}.jpg`, categoryId]
    );
    productIds.push(Number(result.rows[0].id));
  }
  return { categoryId, productIds };
}
