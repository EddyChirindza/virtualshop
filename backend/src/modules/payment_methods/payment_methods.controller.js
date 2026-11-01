const paymentMethodsService = require('./payment_methods.service');
const {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
} = require('./payment_methods.validators');
const { ApiError } = require('../../middlewares/error.middleware');

function parsePaymentMethodId(value) {
  if (!/^[1-9]\d*$/.test(value)) throw new ApiError(400, 'ID de método de pagamento inválido.');
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw new ApiError(400, 'ID de método de pagamento inválido.');
  return id;
}

async function list(req, res, next) {
  try {
    const data = await paymentMethodsService.listPaymentMethods(req.user.id);
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const input = createPaymentMethodSchema.parse(req.body);
    const data = await paymentMethodsService.createPaymentMethod(req.user.id, input);
    res.status(201).json({ success: true, message: 'Método de pagamento adicionado.', data });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const paymentMethodId = parsePaymentMethodId(req.params.id);
    const input = updatePaymentMethodSchema.parse(req.body);
    const data = await paymentMethodsService.updatePaymentMethod(
      req.user.id,
      paymentMethodId,
      input
    );
    res.json({ success: true, message: 'Método de pagamento atualizado.', data });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const paymentMethodId = parsePaymentMethodId(req.params.id);
    const data = await paymentMethodsService.deletePaymentMethod(
      req.user.id,
      paymentMethodId
    );
    res.json({ success: true, message: 'Método de pagamento removido.', data });
  } catch (err) {
    next(err);
  }
}

async function setDefault(req, res, next) {
  try {
    const paymentMethodId = parsePaymentMethodId(req.params.id);
    const data = await paymentMethodsService.setDefaultPaymentMethod(
      req.user.id,
      paymentMethodId
    );
    res.json({ success: true, message: 'Método de pagamento padrão atualizado.', data });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, setDefault };
