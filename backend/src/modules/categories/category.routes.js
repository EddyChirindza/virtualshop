// GET permanece público para o catálogo; as alterações exigem perfil admin.
const { Router } = require('express');
const controller = require('./category.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');

const router = Router();
router.get('/', controller.list);
router.post('/', requireAuth, requireRole('admin'), controller.create);
router.patch('/:id', requireAuth, requireRole('admin'), controller.update);
router.delete('/:id', requireAuth, requireRole('admin'), controller.remove);
module.exports = router;
