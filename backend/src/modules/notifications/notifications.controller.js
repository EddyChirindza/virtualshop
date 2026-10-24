const { ApiError } = require('../../middlewares/error.middleware');
const service = require('./notifications.service');
const { paginationSchema, createNotificationSchema } = require('./notifications.validators');

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError(400, 'Id de notificação inválido.');
  return id;
}

async function list(req, res, next) {
  try {
    const pagination = paginationSchema.parse(req.query);
    const data = await service.listForUser(Number(req.user.id), pagination);
    res.json({ success: true, message: 'OK', data });
  } catch (error) { next(error); }
}

async function unreadCount(req, res, next) {
  try {
    const data = await service.getUnreadCount(Number(req.user.id));
    res.json({ success: true, message: 'OK', data });
  } catch (error) { next(error); }
}

async function markRead(req, res, next) {
  try {
    const data = await service.markAsRead(Number(req.user.id), parseId(req.params.id));
    res.json({ success: true, message: 'Notificação marcada como lida.', data });
  } catch (error) { next(error); }
}

async function markAllRead(req, res, next) {
  try {
    const data = await service.markAllAsRead(Number(req.user.id));
    res.json({ success: true, message: 'Notificações marcadas como lidas.', data });
  } catch (error) { next(error); }
}

async function adminList(req, res, next) {
  try {
    const pagination = paginationSchema.parse(req.query);
    const data = await service.listForAdmin(pagination);
    res.json({ success: true, message: 'OK', data });
  } catch (error) { next(error); }
}

async function adminCreate(req, res, next) {
  try {
    const fields = createNotificationSchema.parse(req.body);
    const data = await service.createByAdmin(fields, Number(req.user.id));
    res.status(201).json({ success: true, message: 'Notificação guardada.', data });
  } catch (error) {
    if (error.code === '23503') return next(new ApiError(400, 'O produto associado não existe.'));
    next(error);
  }
}

async function adminArchive(req, res, next) {
  try {
    const data = await service.archive(parseId(req.params.id));
    res.json({ success: true, message: 'Notificação arquivada.', data });
  } catch (error) { next(error); }
}

module.exports = { list, unreadCount, markRead, markAllRead, adminList, adminCreate, adminArchive };
