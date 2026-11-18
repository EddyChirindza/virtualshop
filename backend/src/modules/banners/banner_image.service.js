const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const { ApiError } = require('../../middlewares/error.middleware');
const { BANNER_UPLOAD_DIR, localUploadPath, uploadUrl } = require('../../utils/upload_paths');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Map([
  ['jpg', 'jpg'],
  ['jpeg', 'jpg'],
  ['png', 'png'],
  ['webp', 'webp'],
]);

function detectExtension(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

function extensionFromName(originalName) {
  const extension = path.extname(originalName || '').slice(1).toLowerCase();
  return ALLOWED_EXTENSIONS.get(extension) || null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 2, fields: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new ApiError(400, 'Formato inválido. Use uma imagem JPG, PNG ou WebP.'));
    }
    if (!extensionFromName(file.originalname)) {
      return cb(new ApiError(400, 'Extensão inválida. Use uma imagem JPG, PNG ou WebP.'));
    }
    return cb(null, true);
  },
});

function receiveImages(req, res, next) {
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'mobile_image', maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(413, 'A imagem é demasiado grande (máximo 5 MB).'));
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ApiError(400, 'Envie apenas uma imagem principal e, opcionalmente, uma imagem mobile.'));
    }
    return next(err instanceof ApiError ? err : new ApiError(400, 'Não foi possível receber a imagem.'));
  });
}

async function persistImage(file, directory = BANNER_UPLOAD_DIR) {
  if (file.buffer && file.buffer.length > MAX_IMAGE_BYTES) {
    throw new ApiError(413, 'A imagem é demasiado grande (máximo 5 MB).');
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new ApiError(400, 'Formato inválido. Use uma imagem JPG, PNG ou WebP.');
  }
  const declaredExtension = extensionFromName(file.originalname);
  const detectedExtension = detectExtension(file.buffer);
  if (!declaredExtension || !detectedExtension) {
    throw new ApiError(400, 'O ficheiro não é uma imagem válida (JPG, PNG ou WebP).');
  }
  if (declaredExtension !== detectedExtension) {
    throw new ApiError(400, 'A extensão do ficheiro não corresponde ao formato da imagem.');
  }
  if (file.buffer.length > MAX_IMAGE_BYTES) {
    throw new ApiError(413, 'A imagem é demasiado grande (máximo 5 MB).');
  }

  await fs.mkdir(directory, { recursive: true });
  const filename = `${crypto.randomUUID()}.${detectedExtension}`;
  await fs.writeFile(path.join(directory, filename), file.buffer, { flag: 'wx' });
  return uploadUrl('banners', filename);
}

async function removeLocalImage(url) {
  const filePath = localUploadPath(url);
  if (!filePath) return;
  await fs.rm(filePath, { force: true });
}

async function saveBannerImages(files) {
  const image = files?.image?.[0];
  const mobileImage = files?.mobile_image?.[0];
  if (!image) throw new ApiError(400, 'Envie uma imagem principal no campo "image".');

  const written = [];
  try {
    const imageUrl = await persistImage(image);
    written.push(imageUrl);
    const mobileImageUrl = mobileImage ? await persistImage(mobileImage) : null;
    if (mobileImageUrl) written.push(mobileImageUrl);
    return { image_url: imageUrl, mobile_image_url: mobileImageUrl };
  } catch (err) {
    await Promise.all(written.map((url) => removeLocalImage(url).catch(() => {})));
    throw err;
  }
}

module.exports = {
  MAX_IMAGE_BYTES,
  detectExtension,
  extensionFromName,
  receiveImages,
  persistImage,
  saveBannerImages,
};
