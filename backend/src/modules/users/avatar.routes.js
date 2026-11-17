// backend/src/modules/users/avatar.routes.js
// POST   /api/users/me/avatar  (multipart, campo "avatar")  -> { avatar_url }
// DELETE /api/users/me/avatar
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Router } = require('express');
const multer = require('multer');
const { query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');

// backend/uploads  (fica fora de src/)
const UPLOAD_ROOT = path.join(__dirname, '..', '..', '..', 'uploads');
const AVATAR_DIR = path.join(UPLOAD_ROOT, 'avatars');
const PUBLIC_PREFIX = '/uploads/avatars/';
const MAX_BYTES = 3 * 1024 * 1024; // o site já envia ~100 KB; 3 MB é folga

fs.mkdirSync(AVATAR_DIR, { recursive: true });

// Guarda em memória, valida o conteúdo real e só depois escreve no disco.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) =>
    /^image\/(jpeg|png|webp)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new ApiError(400, 'Formato inválido. Use uma imagem JPG, PNG ou WebP.')),
});

function receive(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'A imagem é demasiado grande (máximo 3 MB).'));
    next(err instanceof ApiError ? err : new ApiError(400, 'Não foi possível receber a imagem.'));
  });
}

// Não confia no mimetype enviado: confere os primeiros bytes do ficheiro.
function detectExtension(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// Só apaga ficheiros que esta funcionalidade criou (evita apagar caminhos arbitrários).
async function removeFile(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith(PUBLIC_PREFIX)) return;
  const name = path.basename(publicPath);
  if (!/^[\w.-]+$/.test(name)) return;
  await fs.promises.unlink(path.join(AVATAR_DIR, name)).catch(() => {});
}

async function currentAvatar(userId) {
  const { rows } = await query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
  if (!rows[0]) throw new ApiError(404, 'Utilizador não encontrado.');
  return rows[0].avatar_url;
}

async function save(req, res, next) {
  try {
    if (!req.file) throw new ApiError(400, 'Envie uma imagem no campo "avatar".');
    const ext = detectExtension(req.file.buffer);
    if (!ext) throw new ApiError(400, 'O ficheiro não é uma imagem válida (JPG, PNG ou WebP).');

    const userId = Number(req.user.id);
    const filename = `${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    await fs.promises.writeFile(path.join(AVATAR_DIR, filename), req.file.buffer);

    const previous = await currentAvatar(userId);
    const avatarUrl = PUBLIC_PREFIX + filename;
    await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, userId]);
    await removeFile(previous);

    res.json({ success: true, message: 'Fotografia actualizada.', data: { avatar_url: avatarUrl } });
  } catch (error) { next(error); }
}

async function remove(req, res, next) {
  try {
    const userId = Number(req.user.id);
    const previous = await currentAvatar(userId);
    await query('UPDATE users SET avatar_url = NULL WHERE id = $1', [userId]);
    await removeFile(previous);
    res.json({ success: true, message: 'Fotografia removida.', data: { avatar_url: null } });
  } catch (error) { next(error); }
}

const router = Router();
router.use(requireAuth);
router.post('/', receive, save);
router.delete('/', remove);

module.exports = router;
module.exports.UPLOAD_ROOT = UPLOAD_ROOT;