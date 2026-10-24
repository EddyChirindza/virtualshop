const favoritesService = require('./favorites.service');
const { addFavoriteSchema } = require('./favorites.validators');
const { ApiError } = require('../../middlewares/error.middleware');

async function list(req, res, next) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.page_size ? Number(req.query.page_size) : 20;

    if (!Number.isInteger(page) || page < 1) {
      throw new ApiError(400, 'page inválido.');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new ApiError(400, 'page_size inválido.');
    }

    const data = await favoritesService.listFavorites(req.user.id, { page, pageSize });
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    next(err);
  }
}

async function add(req, res, next) {
  try {
    const input = addFavoriteSchema.parse(req.body);
    const data = await favoritesService.addFavorite(req.user.id, input.productId);
    res.status(201).json({ success: true, message: 'Produto adicionado aos favoritos.', data });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new ApiError(400, 'productId inválido.');
    }

    const data = await favoritesService.removeFavorite(req.user.id, productId);
    res.json({ success: true, message: 'Favorito removido.', data });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new ApiError(400, 'productId inválido.');
    }

    const data = await favoritesService.isFavorite(req.user.id, productId);
    res.json({ success: true, message: 'OK', data: { isFavorite: data } });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, add, remove, getOne };
