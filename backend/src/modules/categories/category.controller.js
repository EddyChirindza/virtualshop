// ─────────────────────────────────────────────
// VirtualShop API — Controlador de categorias
// ─────────────────────────────────────────────
const categoryService = require('./category.service');
const { ApiError } = require('../../middlewares/error.middleware');
const { categoryCreateSchema, categoryUpdateSchema } = require('./category.validators');

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Id de categoria inválido.');
  return id;
}
async function list(req, res, next) {
  try {
    const data = req.query.tree === 'true' ? await categoryService.getTree() : await categoryService.getAll();
    res.json({ success: true, message: 'OK', data });
  } catch (err) { next(err); }
}
async function create(req, res, next) {
  try {
    const data = await categoryService.create(categoryCreateSchema.parse(req.body));
    res.status(201).json({ success: true, message: 'Categoria criada.', data });
  } catch (err) {
    if (err.code === '23505') return next(new ApiError(409, 'Já existe uma categoria com este slug.'));
    if (err.code === '23503') return next(new ApiError(400, 'A categoria principal selecionada não existe.'));
    next(err);
  }
}
async function update(req, res, next) {
  try {
    const data = await categoryService.update(parseId(req.params.id), categoryUpdateSchema.parse(req.body));
    res.json({ success: true, message: 'Categoria atualizada.', data });
  } catch (err) {
    if (err.code === '23505') return next(new ApiError(409, 'Já existe uma categoria com este slug.'));
    if (err.code === '23503') return next(new ApiError(400, 'A categoria principal selecionada não existe.'));
    next(err);
  }
}
async function remove(req, res, next) {
  try {
    await categoryService.remove(parseId(req.params.id));
    res.json({ success: true, message: 'Categoria eliminada.' });
  } catch (err) { next(err); }
}
module.exports = { list, create, update, remove };
