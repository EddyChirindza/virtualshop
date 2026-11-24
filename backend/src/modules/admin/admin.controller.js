const adminService = require('./admin.service');
const productImageService = require('./product_image.service');
const { ApiError } = require('../../middlewares/error.middleware');

async function dashboard(req, res, next) {
  try {
    const data = await adminService.getDashboard(req.query.period);
    res.json({ success: true, message: 'OK', data });
  } catch (err) { next(err); }
}

async function customers(req, res, next) {
  try {
    const data = await adminService.getCustomers();
    res.json({ success: true, message: 'OK', data });
  } catch (err) { next(err); }
}

async function customerDetails(req, res, next) {
  try {
    const data = await adminService.getCustomerDetails(req.params.id);
    res.json({ success: true, message: 'OK', data });
  } catch (err) { next(err); }
}

async function uploadProductImage(req, res, next) {
  try {
    const data = await productImageService.saveProductImage(req.body);
    res.status(201).json({ success: true, message: 'Imagem guardada.', data });
  } catch (err) { next(err); }
}

async function productReviews(req, res, next) {
  try {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
    const rating = req.query.rating === undefined ? undefined : Number(req.query.rating);
    const productId = req.query.productId === undefined ? undefined : Number(req.query.productId);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!Number.isInteger(page) || page < 1) throw new ApiError(400, 'page deve ser um inteiro maior que zero.');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApiError(400, 'limit deve ser um inteiro entre 1 e 100.');
    }
    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      throw new ApiError(400, 'rating deve ser um inteiro entre 1 e 5.');
    }
    if (productId !== undefined && (!Number.isInteger(productId) || productId < 1)) {
      throw new ApiError(400, 'productId deve ser um inteiro maior que zero.');
    }
    const data = await adminService.getProductReviewReport({ page, limit, rating, productId, q });
    res.json({ success: true, message: 'OK', data });
  } catch (err) { next(err); }
}

async function deleteProductReview(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Id da avaliação inválido.');
    const data = await adminService.deleteProductReview(id);
    res.json({ success: true, message: 'Avaliação eliminada.', data });
  } catch (err) { next(err); }
}

module.exports = { dashboard, customers, customerDetails, uploadProductImage, productReviews, deleteProductReview };
