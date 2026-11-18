const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');

const { errorHandler } = require('../src/middlewares/error.middleware');
const {
  BANNER_UPLOAD_DIR,
  localUploadPath,
} = require('../src/utils/upload_paths');
const {
  MAX_IMAGE_BYTES,
  detectExtension,
  extensionFromName,
  persistImage,
  receiveImages,
  saveBannerImages,
} = require('../src/modules/banners/banner_image.service');
const { removeUnreferencedUploads } = require('../src/services/upload_files.service');

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'ascii'), Buffer.from([0x1a, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'), Buffer.alloc(12),
]);

test('detectExtension e extensionFromName validam assinatura e extensão', () => {
  assert.equal(detectExtension(PNG), 'png');
  assert.equal(detectExtension(JPG), 'jpg');
  assert.equal(detectExtension(WEBP), 'webp');
  assert.equal(detectExtension(Buffer.from('not an image')), null);
  assert.equal(extensionFromName('banner.PNG'), 'png');
  assert.equal(extensionFromName('banner.jpeg'), 'jpg');
  assert.equal(extensionFromName('banner.exe'), null);
  assert.equal(extensionFromName('banner'), null);
});

test('localUploadPath aceita a pasta de banners e bloqueia path traversal', () => {
  assert.equal(
    localUploadPath('/uploads/banners/a.jpg'),
    path.join(BANNER_UPLOAD_DIR, 'a.jpg')
  );
  assert.equal(localUploadPath('/uploads/banners/../../etc/passwd'), null);
  assert.equal(localUploadPath('/uploads/unknown/a.jpg'), null);
});

test('persistImage rejeita MIME, extensão, assinatura e tamanho inválidos', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'virtualshop-banner-upload-'));
  try {
    const valid = await persistImage(
      { buffer: PNG, mimetype: 'image/png', originalname: 'banner.png' },
      directory
    );
    assert.match(valid, /^\/uploads\/banners\/[0-9a-f-]{36}\.png$/);
    assert.equal(await fs.stat(path.join(directory, path.basename(valid))).then(() => true), true);

    await assert.rejects(
      () => persistImage({ buffer: PNG, mimetype: 'text/plain', originalname: 'banner.png' }, directory),
      (error) => error.statusCode === 400
    );
    await assert.rejects(
      () => persistImage({ buffer: PNG, mimetype: 'image/png', originalname: 'banner.exe' }, directory),
      (error) => error.statusCode === 400
    );
    await assert.rejects(
      () => persistImage({ buffer: Buffer.from('evil'), mimetype: 'image/png', originalname: 'banner.png' }, directory),
      (error) => error.statusCode === 400
    );
    await assert.rejects(
      () => persistImage({ buffer: JPG, mimetype: 'image/png', originalname: 'banner.png' }, directory),
      (error) => error.statusCode === 400 && /extensão/i.test(error.message)
    );
    await assert.rejects(
      () => persistImage(
        { buffer: Buffer.alloc(MAX_IMAGE_BYTES + 1), mimetype: 'image/png', originalname: 'banner.png' },
        directory
      ),
      (error) => error.statusCode === 413
    );
    assert.equal((await fs.readdir(directory)).length, 1, 'uploads inválidos não são escritos');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('saveBannerImages exige imagem principal', async () => {
  await assert.rejects(
    () => saveBannerImages({}),
    (error) => error.statusCode === 400 && /imagem principal/.test(error.message)
  );
});

test('endpoint de upload aceita imagem principal e mobile e rejeita tipos inválidos', async (t) => {
  const app = express();
  app.post('/image', receiveImages, async (req, res, next) => {
    try {
      const data = await saveBannerImages(req.files);
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  });
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const url = `http://127.0.0.1:${server.address().port}/image`;
  const written = [];

  const form = new FormData();
  form.append('image', new Blob([PNG], { type: 'image/png' }), 'principal.png');
  form.append('mobile_image', new Blob([WEBP], { type: 'image/webp' }), 'mobile.webp');
  const response = await fetch(url, { method: 'POST', body: form });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.match(body.data.image_url, /^\/uploads\/banners\/[0-9a-f-]{36}\.png$/);
  assert.match(body.data.mobile_image_url, /^\/uploads\/banners\/[0-9a-f-]{36}\.webp$/);
  written.push(body.data.image_url, body.data.mobile_image_url);

  const badForm = new FormData();
  badForm.append('image', new Blob(['script'], { type: 'text/plain' }), 'evil.txt');
  const badResponse = await fetch(url, { method: 'POST', body: badForm });
  assert.equal(badResponse.status, 400);

  const largeForm = new FormData();
  largeForm.append('image', new Blob([Buffer.alloc(MAX_IMAGE_BYTES + 1)], { type: 'image/png' }), 'large.png');
  const largeResponse = await fetch(url, { method: 'POST', body: largeForm });
  assert.equal(largeResponse.status, 413);

  t.after(async () => {
    for (const fileUrl of written) {
      const filePath = localUploadPath(fileUrl);
      if (filePath) await fs.rm(filePath, { force: true });
    }
  });
});

test('limpeza considera imagens de banners e não apaga ficheiros referenciados', async () => {
  const removed = [];
  let seenSql = '';
  const result = await removeUnreferencedUploads(
    ['/uploads/banners/used.jpg', '/uploads/banners/orphan.jpg'],
    {
      queryFn: async (sql) => {
        seenSql = sql;
        return { rows: [{ url: '/uploads/banners/used.jpg' }] };
      },
      removeFile: async (url) => {
        removed.push(url);
        return true;
      },
    }
  );
  assert.match(seenSql, /FROM banners/);
  assert.match(seenSql, /mobile_image_url/);
  assert.deepEqual(result, ['/uploads/banners/orphan.jpg']);
  assert.deepEqual(removed, ['/uploads/banners/orphan.jpg']);
});
