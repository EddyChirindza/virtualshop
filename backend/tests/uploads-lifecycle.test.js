const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async () => {
      throw new Error('A base de dados não deve ser usada neste teste.');
    },
    pool: {},
  },
};

const {
  PRODUCT_UPLOAD_DIR,
  AVATAR_UPLOAD_DIR,
  normalizeUploadUrl,
  localUploadPath,
} = require('../src/utils/upload_paths');
const {
  removeUnreferencedUploads,
  cleanupOrphanedUploads,
} = require('../src/services/upload_files.service');

test('localUploadPath aceita apenas caminhos de upload seguros e conhecidos', () => {
  assert.equal(
    localUploadPath('/uploads/products/a.jpg'),
    path.join(PRODUCT_UPLOAD_DIR, 'a.jpg')
  );
  assert.equal(
    localUploadPath('/uploads/avatars/a.webp'),
    path.join(AVATAR_UPLOAD_DIR, 'a.webp')
  );
  assert.equal(normalizeUploadUrl('/uploads/products/a.jpg?v=1'), '/uploads/products/a.jpg');
  assert.equal(localUploadPath('/uploads/products/../../etc/passwd'), null);
  assert.equal(localUploadPath('/uploads/products/%2e%2e%2fpasswd'), null);
  assert.equal(localUploadPath('/uploads/products/.env'), null);
  assert.equal(localUploadPath('/uploads/other/a.jpg'), null);
  assert.equal(localUploadPath('https://example.com/uploads/products/a.jpg'), null);
});

test('removeUnreferencedUploads ignora URLs remotas e referências ativas', async () => {
  const removed = [];
  let queryParams;

  const result = await removeUnreferencedUploads(
    [
      '/uploads/products/a.jpg',
      '/uploads/products/b.jpg',
      '/uploads/products/a.jpg',
      '/uploads/products/c.jpg?v=2',
      'https://example.com/products/d.jpg',
      '/uploads/other/e.jpg',
    ],
    {
      queryFn: async (_sql, params) => {
        queryParams = params[0];
        return {
          rows: [
            { url: '/uploads/products/a.jpg' },
            { url: '/uploads/products/c.jpg' },
          ],
        };
      },
      removeFile: async (url) => {
        removed.push(url);
        return true;
      },
    }
  );

  assert.deepEqual(queryParams, [
    '/uploads/products/a.jpg',
    '/uploads/products/b.jpg',
    '/uploads/products/c.jpg',
  ]);
  assert.deepEqual(removed, ['/uploads/products/b.jpg']);
  assert.deepEqual(result, ['/uploads/products/b.jpg']);
});

test('removeUnreferencedUploads não consulta a base de dados sem uploads locais', async () => {
  let queried = false;
  const removed = await removeUnreferencedUploads(
    ['https://example.com/a.jpg', '/images/local.jpg'],
    {
      queryFn: async () => {
        queried = true;
        return { rows: [] };
      },
    }
  );

  assert.equal(queried, false);
  assert.deepEqual(removed, []);
});

test('cleanupOrphanedUploads respeita referências, período de graça e dry-run', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'virtualshop-cleanup-'));
  const productsDir = path.join(root, 'products');
  const avatarsDir = path.join(root, 'avatars');
  await fs.mkdir(productsDir, { recursive: true });
  await fs.mkdir(avatarsDir, { recursive: true });

  const files = {
    keepProduct: path.join(productsDir, 'keep.jpg'),
    oldProduct: path.join(productsDir, 'old.jpg'),
    recentProduct: path.join(productsDir, 'recent.jpg'),
    oldAvatar: path.join(avatarsDir, 'old.png'),
    keepAvatar: path.join(avatarsDir, 'keep.webp'),
  };

  try {
    await Promise.all(Object.values(files).map((file) => fs.writeFile(file, 'image')));
    await fs.writeFile(path.join(productsDir, '.gitkeep'), '');
    await fs.mkdir(path.join(productsDir, 'nested'));

    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await Promise.all([
      fs.utimes(files.keepProduct, oldDate, oldDate),
      fs.utimes(files.oldProduct, oldDate, oldDate),
      fs.utimes(files.oldAvatar, oldDate, oldDate),
      fs.utimes(files.keepAvatar, oldDate, oldDate),
    ]);

    const queryFn = async () => ({
      rows: [
        { url: '/uploads/products/keep.jpg' },
        { url: '/uploads/avatars/keep.webp' },
      ],
    });
    const directories = [
      { name: 'products', path: productsDir },
      { name: 'avatars', path: avatarsDir },
    ];

    const dryRun = await cleanupOrphanedUploads({
      dryRun: true,
      queryFn,
      directories,
    });

    assert.equal(dryRun.scanned, 5);
    assert.equal(dryRun.referenced, 2);
    assert.equal(dryRun.skippedRecent, 1);
    assert.deepEqual(dryRun.wouldDelete.sort(), [
      '/uploads/avatars/old.png',
      '/uploads/products/old.jpg',
    ]);
    assert.deepEqual(dryRun.deleted, []);
    assert.equal(await exists(files.oldProduct), true);

    const result = await cleanupOrphanedUploads({ queryFn, directories });

    assert.equal(result.scanned, 5);
    assert.equal(result.referenced, 2);
    assert.equal(result.skippedRecent, 1);
    assert.deepEqual(result.deleted.sort(), [
      '/uploads/avatars/old.png',
      '/uploads/products/old.jpg',
    ]);
    assert.deepEqual(result.errors, []);
    assert.equal(await exists(files.oldProduct), false);
    assert.equal(await exists(files.oldAvatar), false);
    assert.equal(await exists(files.keepProduct), true);
    assert.equal(await exists(files.keepAvatar), true);
    assert.equal(await exists(files.recentProduct), true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
