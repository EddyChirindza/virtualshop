const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { ApiError } = require('../../middlewares/error.middleware');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/products');

function detectImage(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

async function saveProductImage({ base64 }) {
  if (typeof base64 !== 'string' || base64.length === 0) throw new ApiError(400, 'Escolhe uma imagem para carregar.');
  const encoded = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw new ApiError(400, 'A imagem deve ter no máximo 5 MB.');
  if (bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) throw new ApiError(400, 'O ficheiro de imagem é inválido.');
  const extension = detectImage(bytes);
  if (!extension) throw new ApiError(400, 'Formato não suportado. Usa PNG, JPEG ou WebP.');
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), bytes, { flag: 'wx' });
  return { image_url: `/uploads/products/${filename}` };
}

module.exports = { saveProductImage };
