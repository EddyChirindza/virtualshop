const { ApiError } = require('../../middlewares/error.middleware');
const service = require('./administrator.service');
const {
  createAdministratorSchema,
  updateAdministratorSchema,
} = require('./administrator.validators');

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ApiError(400, 'Id de administrador inválido.');
  }
  return id;
}

async function listAdministrators(req, res, next) {
  try {
    const data = await service.listAdministrators();
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    next(err);
  }
}

async function createAdministrator(req, res, next) {
  try {
    const fields = createAdministratorSchema.parse(req.body);
    const data = await service.createAdministrator(fields);
    res.status(201).json({
      success: true,
      message: 'Administrador criado.',
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function updateAdministrator(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const fields = updateAdministratorSchema.parse(req.body);
    const data = await service.updateAdministrator(id, fields, req.user.id);
    res.json({
      success: true,
      message: 'Administrador atualizado.',
      data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAdministrators,
  createAdministrator,
  updateAdministrator,
};
