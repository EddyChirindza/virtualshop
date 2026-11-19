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
    if (!Number.isInteger(page) || page < 1) throw new ApiError(400, 'page deve ser um inteiro maior que zero.');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApiError(400, 'limit deve ser um inteiro entre 1 e 100.');
    }
    const data = await adminService.getProductReviewReport({ page, limit });
    res.json({ success: true, message: 'OK', data });
  } catch (err) { next(err); }
}

module.exports = { dashboard, customers, customerDetails, uploadProductImage, productReviews };
