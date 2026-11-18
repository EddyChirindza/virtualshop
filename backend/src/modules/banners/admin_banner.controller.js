const { ApiError } = require('../../middlewares/error.middleware');
const service = require('./banner.service');
const imageService = require('./banner_image.service');
const {
  bannerCreateSchema,
  bannerUpdateSchema,
  bannerPaginationSchema,
} = require('./banner.validators');

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError(400, 'Id de banner inválido.');
  return id;
}

async function list(req, res, next) {
  try {
    const pagination = bannerPaginationSchema.parse(req.query);
    const data = await service.listAdmin(pagination);
    res.json({ success: true, message: 'OK', data });
  } catch (err) { next(err); }
}

async function detail(req, res, next) {
  try {
    const data = await service.getAdminById(parseId(req.params.id));
    res.json({ success: true, message: 'OK', data });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = await service.create(bannerCreateSchema.parse(req.body));
    res.status(201).json({ success: true, message: 'Banner criado.', data });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = await service.update(parseId(req.params.id), bannerUpdateSchema.parse(req.body));
    res.json({ success: true, message: 'Banner atualizado.', data });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const data = await service.remove(parseId(req.params.id));
    res.json({ success: true, message: 'Banner eliminado.', data });
  } catch (err) { next(err); }
}

async function uploadImage(req, res, next) {
  try {
    const data = await imageService.saveBannerImages(req.files);
    res.status(201).json({ success: true, message: 'Imagem guardada.', data });
  } catch (err) { next(err); }
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  uploadImage,
  receiveImages: imageService.receiveImages,
};
