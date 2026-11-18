const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');

const dbPath = require.resolve('../src/config/db');
const servicePath = require.resolve('../src/modules/banners/banner.service');

const rolesById = new Map([[1, 'admin'], [2, 'customer']]);

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql) => {
      if (sql.includes('FROM user_sessions')) {
        return { rows: [{ role: currentRole }] };
      }
      throw new Error('A base de dados não deve ser usada neste teste.');
    },
    pool: {},
  },
};

let currentRole = 'admin';

require.cache[servicePath] = {
  id: servicePath,
  filename: servicePath,
  loaded: true,
  exports: {
    getPublic: async () => ({ items: [] }),
    listAdmin: async () => ({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
    getAdminById: async (id) => ({ id, name: 'Banner' }),
    create: async (fields) => fields,
    update: async (id, fields) => ({ id, ...fields }),
    remove: async (id) => ({ id }),
  },
};

const { generateAccessToken } = require('../src/utils/tokens');
const { errorHandler } = require('../src/middlewares/error.middleware');
const bannerRoutes = require('../src/modules/banners/banner.routes');
const adminRoutes = require('../src/modules/admin/admin.routes');

const app = express();
app.use(express.json());
app.use('/api/banners', bannerRoutes);
app.use('/api/admin', adminRoutes);
app.use(errorHandler);

function tokenFor(userId) {
  return generateAccessToken({ id: userId, role: rolesById.get(userId) }, crypto.randomUUID());
}

async function request(method, url, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:${app.listenPort}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

const server = app.listen(0, '127.0.0.1');
const listening = new Promise((resolve) => server.once('listening', resolve));
after(() => new Promise((resolve) => server.close(resolve)));

test('API pública de banners não exige autenticação', async () => {
  await listening;
  app.listenPort = server.address().port;

  const response = await request('GET', '/api/banners');
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, 'Banners retrieved successfully');
  assert.deepEqual(response.body.data, { items: [] });
});

test('endpoints administrativos exigem admin autenticado', async () => {
  const anonymous = await request('GET', '/api/admin/banners');
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.body.success, false);

  currentRole = 'customer';
  const customer = await request('GET', '/api/admin/banners', { token: tokenFor(2) });
  assert.equal(customer.status, 403);
  assert.equal(customer.body.success, false);

  currentRole = 'admin';
  const admin = await request('GET', '/api/admin/banners', { token: tokenFor(1) });
  assert.equal(admin.status, 200);
  assert.equal(admin.body.success, true);

  const detail = await request('GET', '/api/admin/banners/7', { token: tokenFor(1) });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.id, 7);
});

test('payloads inválidos são rejeitados antes de chegar ao serviço', async () => {
  currentRole = 'admin';
  const invalid = await request('POST', '/api/admin/banners', {
    token: tokenFor(1),
    body: { title_pt: 'Sem nome', image_url: '/uploads/banners/a.jpg' },
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.success, false);

  const unexpected = await request('PATCH', '/api/admin/banners/7', {
    token: tokenFor(1),
    body: { is_active: false, internal_flag: true },
  });
  assert.equal(unexpected.status, 400);

  const valid = await request('PATCH', '/api/admin/banners/7', {
    token: tokenFor(1),
    body: { is_active: false },
  });
  assert.equal(valid.status, 200);
  assert.equal(valid.body.data.is_active, false);
});
