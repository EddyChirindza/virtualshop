const orderService = require('./order.service');
const { checkoutSchema } = require('./order.validators');
const { ApiError } = require('../../middlewares/error.middleware');

async function checkout(req, res, next) {
  try {
    const payload = checkoutSchema.parse(req.body || {});
    const data = await orderService.checkout(req.user.id, payload);
    res.status(201).json({ success: true, message: 'Pedido criado com sucesso.', data });
  } catch (err) {
    next(err);
  }
}

async function detail(req, res, next) {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new ApiError(400, 'Id de pedido inválido.');
    }

    const data = await orderService.getOrderById(req.user.id, orderId);
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    next(err);
  }
}

module.exports = { checkout, detail };
