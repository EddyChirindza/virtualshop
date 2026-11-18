const service = require('./banner.service');

async function list(req, res, next) {
  try {
    const data = await service.getPublic();
    res.json({ success: true, message: 'Banners retrieved successfully', data });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
