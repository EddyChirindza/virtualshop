const fs = require('node:fs/promises');
const path = require('node:path');
const { query } = require('../config/db');
const logger = require('../utils/logger');
const {
  PRODUCT_UPLOAD_DIR,
  AVATAR_UPLOAD_DIR,
  normalizeUploadUrl,
  localUploadPath,
  uploadUrl,
} = require('../utils/upload_paths');

const DEFAULT_MIN_AGE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DIRECTORIES = [
  { name: 'products', path: PRODUCT_UPLOAD_DIR },
  { name: 'avatars', path: AVATAR_UPLOAD_DIR },
];

async function removeUploadedFile(url) {
  const filePath = localUploadPath(url);
  if (!filePath) return false;

  try {
    await fs.rm(filePath, { force: true });
    return true;
  } catch (err) {
    logger.warn('Não foi possível remover um ficheiro carregado.', {
      url,
      error: err.message,
    });
    return false;
  }
}

async function removeUnreferencedUploads(urls, {
  queryFn = query,
  removeFile = removeUploadedFile,
} = {}) {
  const candidates = [...new Set(
    (urls || [])
      .map(normalizeUploadUrl)
      .filter((url) => url && localUploadPath(url))
  )];
  if (candidates.length === 0) return [];

  const { rows } = await queryFn(
    `SELECT refs.url
     FROM (
       SELECT image_url AS url FROM products WHERE image_url = ANY($1::text[])
       UNION
       SELECT item.url FROM products p
         CROSS JOIN LATERAL unnest(p.image_urls) AS item(url)
         WHERE item.url = ANY($1::text[])
       UNION
       SELECT avatar_url AS url FROM users WHERE avatar_url = ANY($1::text[])
       UNION
       SELECT icon_url AS url FROM categories WHERE icon_url = ANY($1::text[])
     ) refs
     WHERE refs.url IS NOT NULL`,
    [candidates]
  );

  const referenced = new Set(
    rows.map((row) => normalizeUploadUrl(row.url)).filter(Boolean)
  );
  const removed = [];

  for (const url of candidates) {
    if (referenced.has(url)) continue;
    if (await removeFile(url)) removed.push(url);
  }

  return removed;
}

async function removeUnreferencedUploadsSafely(urls, options) {
  try {
    return await removeUnreferencedUploads(urls, options);
  } catch (err) {
    logger.warn('Não foi possível limpar uploads não referenciados.', {
      error: err.message,
    });
    return [];
  }
}

async function listReferencedUploads({ queryFn = query } = {}) {
  const { rows } = await queryFn(
    `SELECT image_url AS url FROM products WHERE image_url LIKE '/uploads/%'
     UNION
     SELECT item.url FROM products p
       CROSS JOIN LATERAL unnest(p.image_urls) AS item(url)
       WHERE item.url LIKE '/uploads/%'
     UNION
     SELECT avatar_url AS url FROM users WHERE avatar_url LIKE '/uploads/%'
     UNION
     SELECT icon_url AS url FROM categories WHERE icon_url LIKE '/uploads/%'`
  );

  return new Set(
    rows.map((row) => normalizeUploadUrl(row.url)).filter(Boolean)
  );
}

async function cleanupOrphanedUploads({
  dryRun = false,
  minAgeMs = DEFAULT_MIN_AGE_MS,
  now = Date.now(),
  queryFn = query,
  directories = DEFAULT_DIRECTORIES,
} = {}) {
  const referenced = await listReferencedUploads({ queryFn });
  const report = {
    dryRun,
    minAgeMs,
    scanned: 0,
    referenced: 0,
    skippedRecent: 0,
    deleted: [],
    wouldDelete: [],
    errors: [],
  };

  for (const directory of directories) {
    let entries;
    try {
      entries = await fs.readdir(directory.path, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }

    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith('.')) continue;

      report.scanned += 1;
      const url = uploadUrl(directory.name, entry.name);
      if (referenced.has(url)) {
        report.referenced += 1;
        continue;
      }

      const filePath = path.join(directory.path, entry.name);
      let stats;
      try {
        stats = await fs.stat(filePath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          report.errors.push({ url, error: err.message });
        }
        continue;
      }

      if (now - stats.mtimeMs < minAgeMs) {
        report.skippedRecent += 1;
        continue;
      }

      if (dryRun) {
        report.wouldDelete.push(url);
        continue;
      }

      try {
        await fs.rm(filePath, { force: true });
        report.deleted.push(url);
      } catch (err) {
        report.errors.push({ url, error: err.message });
      }
    }
  }

  return report;
}

module.exports = {
  DEFAULT_MIN_AGE_MS,
  removeUploadedFile,
  removeUnreferencedUploads,
  removeUnreferencedUploadsSafely,
  cleanupOrphanedUploads,
};
