const cartService = require('./cart.service');
const { addCartItemSchema, updateCartItemSchema } = require('./cart.validators');
const { ApiError } = require('../../middlewares/error.middleware');

async function get(req, res, next) {
  try {
    const data = await cartService.getCart(req.user.id);
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const payload = addCartItemSchema.parse(req.body);
    const data = await cartService.addItem(req.user.id, payload);
    res.status(201).json({ success: true, message: 'Item adicionado ao carrinho.', data });
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new ApiError(400, 'Id do item inválido.');
    }

    const payload = updateCartItemSchema.parse(req.body);
    const data = await cartService.updateItem(req.user.id, itemId, payload);
    res.json({ success: true, message: 'Item atualizado.', data });
  } catch (err) {
    next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new ApiError(400, 'Id do item inválido.');
    }

    const data = await cartService.removeItem(req.user.id, itemId);
    res.json({ success: true, message: 'Item removido.', data });
  } catch (err) {
    next(err);
  }
}

async function clear(req, res, next) {
  try {
    const data = await cartService.clearCart(req.user.id);
    res.json({ success: true, message: 'Carrinho limpo.', data });
  } catch (err) {
    next(err);
  }
}

module.exports = { get, addItem, updateItem, removeItem, clear };
