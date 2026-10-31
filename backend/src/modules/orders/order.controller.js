const orderService = require('./order.service');
const {
  checkoutSchema,
  listOrdersQuerySchema,
  rejectOrderSchema,
  updateOrderStatusSchema,
} = require('./order.validators');
const { ApiError } = require('../../middlewares/error.middleware');

function parseOrderId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'Id de pedido inválido.');
  }
  return id;
}

async function checkout(req, res, next) {
  try {
    const payload = checkoutSchema.parse(req.body || {});
    const data = await orderService.checkout(req.user.id, payload);
    res.status(201).json({ success: true, message: 'Pedido criado com sucesso.', data });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const data = await orderService.listOrdersForUser(req.user.id);
    res.json({ success: true, message: 'OK', data: { items: data } });
  } catch (err) {
    next(err);
  }
}

async function detail(req, res, next) {
  try {
    const data = await orderService.getOrderById(req.user.id, parseOrderId(req.params.id));
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    next(err);
  }
}

async function adminList(req, res, next) {
  try {
    const filters = listOrdersQuerySchema.parse(req.query);
    const data = await orderService.listOrdersForAdmin(filters);
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    next(err);
  }
}

async function adminDetail(req, res, next) {
  try {
    const data = await orderService.getOrderForAdmin(parseOrderId(req.params.id));
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    next(err);
  }
}

async function adminAccept(req, res, next) {
  try {
    const data = await orderService.acceptOrder(req.user.id, parseOrderId(req.params.id));
    res.json({ success: true, message: 'Pedido aceite.', data });
  } catch (err) {
    next(err);
  }
}

async function adminReject(req, res, next) {
  try {
    const orderId = parseOrderId(req.params.id);
    const { reason } = rejectOrderSchema.parse(req.body || {});
    const data = await orderService.rejectOrder(req.user.id, orderId, reason);
    res.json({ success: true, message: 'Pedido rejeitado.', data });
  } catch (err) {
    next(err);
  }
}

async function adminUpdateStatus(req, res, next) {
  try {
    const orderId = parseOrderId(req.params.id);
    const { status } = updateOrderStatusSchema.parse(req.body || {});
    const data = await orderService.updateOrderStatus(req.user.id, orderId, status);
    res.json({ success: true, message: 'Estado do pedido atualizado.', data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkout,
  list,
  detail,
  adminList,
  adminDetail,
  adminAccept,
  adminReject,
  adminUpdateStatus,
};
