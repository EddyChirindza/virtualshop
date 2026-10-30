const path = require('node:path');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');
const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'products');
const AVATAR_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'avatars');
const UPLOAD_URL_PREFIX = '/uploads/';
const UPLOAD_FOLDERS = new Set(['products', 'avatars']);
const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function normalizeUploadUrl(url) {
  if (typeof url !== 'string') return null;
  const normalized = url.split(/[?#]/, 1)[0];
  return normalized.startsWith(UPLOAD_URL_PREFIX) ? normalized : null;
}

function localUploadPath(url) {
  const normalized = normalizeUploadUrl(url);
  if (!normalized) return null;

  const parts = normalized.slice(UPLOAD_URL_PREFIX.length).split('/');
  if (parts.length !== 2) return null;

  const [folder, filename] = parts;
  if (!UPLOAD_FOLDERS.has(folder) || !SAFE_FILENAME.test(filename)) return null;

  return path.join(UPLOAD_ROOT, folder, filename);
}

function uploadUrl(folder, filename) {
  return `${UPLOAD_URL_PREFIX}${folder}/${filename}`;
}

module.exports = {
  UPLOAD_ROOT,
  PRODUCT_UPLOAD_DIR,
  AVATAR_UPLOAD_DIR,
  UPLOAD_URL_PREFIX,
  normalizeUploadUrl,
  localUploadPath,
  uploadUrl,
};
