const adminService = require('./admin.service');
const productImageService = require('./product_image.service');

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

async function uploadProductImage(req, res, next) {
  try {
    const data = await productImageService.saveProductImage(req.body);
    res.status(201).json({ success: true, message: 'Imagem guardada.', data });
  } catch (err) { next(err); }
}

module.exports = { dashboard, customers, uploadProductImage };
