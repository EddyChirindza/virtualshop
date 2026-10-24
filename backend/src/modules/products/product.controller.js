// ─────────────────────────────────────────────
// VirtualShop API — Controlador de produtos
// ─────────────────────────────────────────────
const productService = require('./product.service');
const { ApiError } = require('../../middlewares/error.middleware');
const { productListSchema, productCreateSchema, productUpdateSchema } = require('./product.validators');

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Id de produto inválido.');
  return id;
}
async function popular(req, res, next) {
  try { res.json({ success: true, message: 'OK', data: await productService.getPopular() }); } catch (err) { next(err); }
}
async function newArrivals(req, res, next) {
  try { res.json({ success: true, message: 'OK', data: await productService.getNewArrivals() }); } catch (err) { next(err); }
}
async function detail(req, res, next) {
  try { res.json({ success: true, message: 'OK', data: await productService.getById(parseId(req.params.id)) }); } catch (err) { next(err); }
}
async function list(req, res, next) {
  try {
    const params = productListSchema.parse(req.query);
    const result = await productService.getAll({ q: params.q || undefined, categoryId: params.category ?? params.category_id,
      minPrice: params.minPrice, maxPrice: params.maxPrice, sort: params.sort,
      page: params.page ?? 1, limit: params.limit ?? params.page_size ?? 20 });
    res.json({ success: true, message: 'OK', ...result });
  } catch (err) { next(err); }
}
async function create(req, res, next) {
  try {
    const data = await productService.create(productCreateSchema.parse(req.body));
    res.status(201).json({ success: true, message: 'Produto criado.', data });
  } catch (err) {
    if (err.code === '23505') return next(new ApiError(409, 'Já existe um produto com estes dados únicos.'));
    if (err.code === '23503') return next(new ApiError(400, 'A categoria selecionada não existe.'));
    next(err);
  }
}
async function update(req, res, next) {
  try {
    const data = await productService.update(parseId(req.params.id), productUpdateSchema.parse(req.body));
    res.json({ success: true, message: 'Produto atualizado.', data });
  } catch (err) {
    if (err.code === '23503') return next(new ApiError(400, 'A categoria selecionada não existe.'));
    next(err);
  }
}
async function remove(req, res, next) {
  try {
    await productService.remove(parseId(req.params.id));
    res.json({ success: true, message: 'Produto eliminado.' });
  } catch (err) { next(err); }
}

module.exports = { popular, newArrivals, detail, list, create, update, remove };
