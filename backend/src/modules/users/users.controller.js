const usersService = require('./users.service');
const {
  profileUpdateSchema,
  changePasswordSchema,
  createAddressSchema,
  updateAddressSchema,
} = require('./users.validators');
const { ApiError } = require('../../middlewares/error.middleware');

function parseAddressId(value) {
  if (!/^[1-9]\d*$/.test(value)) throw new ApiError(400, 'ID de endereço inválido.');
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw new ApiError(400, 'ID de endereço inválido.');
  return id;
}

async function getProfile(req, res, next) {
  try {
    const data = await usersService.getProfile(req.user.id);
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const input = profileUpdateSchema.parse(req.body);
    const data = await usersService.updateProfile(req.user.id, input);
    res.json({ success: true, message: 'Perfil atualizado.', data });
  } catch (err) {
    next(err);
  }
}

async function updateProfilePhoto(req, res, next) {
  try {
    const data = await usersService.updateProfilePhoto(req.user.id, req.body?.base64);
    res.json({ success: true, message: 'Fotografia de perfil atualizada.', data });
  } catch (err) {
    next(err);
  }
}

async function updatePassword(req, res, next) {
  try {
    const input = changePasswordSchema.parse(req.body);
    await usersService.updatePassword(req.user.id, input);
    res.json({ success: true, message: 'Password alterada com sucesso.' });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const data = await usersService.getStats(req.user.id);
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    next(err);
  }
}

async function listAddresses(req, res, next) {
  try {
    const data = await usersService.listAddresses(req.user.id);
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    next(err);
  }
}

async function createAddress(req, res, next) {
  try {
    const input = createAddressSchema.parse(req.body);
    const data = await usersService.createAddress(req.user.id, input);
    res.status(201).json({ success: true, message: 'Endereço criado.', data });
  } catch (err) {
    next(err);
  }
}

async function updateAddress(req, res, next) {
  try {
    const addressId = parseAddressId(req.params.id);
    const input = updateAddressSchema.parse(req.body);
    const data = await usersService.updateAddress(req.user.id, addressId, input);
    res.json({ success: true, message: 'Endereço atualizado.', data });
  } catch (err) {
    next(err);
  }
}

async function deleteAddress(req, res, next) {
  try {
    const addressId = parseAddressId(req.params.id);
    const data = await usersService.deleteAddress(req.user.id, addressId);
    res.json({ success: true, message: 'Endereço removido.', data });
  } catch (err) {
    next(err);
  }
}

async function setDefaultAddress(req, res, next) {
  try {
    const addressId = parseAddressId(req.params.id);
    const data = await usersService.setDefaultAddress(req.user.id, addressId);
    res.json({ success: true, message: 'Endereço padrão atualizado.', data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePhoto,
  updatePassword,
  getStats,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
