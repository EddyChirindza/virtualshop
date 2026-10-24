const { Router } = require('express');
const controller = require('./admin.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const notificationsController = require('../notifications/notifications.controller');

const router = Router();
router.use(requireAuth, requireRole('admin'));
router.get('/dashboard', controller.dashboard);
router.get('/customers', controller.customers);
router.post('/products/image', controller.uploadProductImage);
router.get('/notifications', notificationsController.adminList);
router.post('/notifications', notificationsController.adminCreate);
router.patch('/notifications/:id/archive', notificationsController.adminArchive);

module.exports = router;
