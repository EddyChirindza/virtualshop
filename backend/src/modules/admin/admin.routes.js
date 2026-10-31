const { Router } = require('express');
const controller = require('./admin.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const notificationsController = require('../notifications/notifications.controller');
const orderController = require('../orders/order.controller');

const router = Router();
router.use(requireAuth, requireRole('admin'));
router.get('/dashboard', controller.dashboard);
router.get('/customers', controller.customers);
router.post('/products/image', controller.uploadProductImage);
router.get('/orders', orderController.adminList);
router.get('/orders/:id', orderController.adminDetail);
router.post('/orders/:id/accept', orderController.adminAccept);
router.post('/orders/:id/reject', orderController.adminReject);
router.patch('/orders/:id/status', orderController.adminUpdateStatus);
router.get('/notifications', notificationsController.adminList);
router.post('/notifications', notificationsController.adminCreate);
router.patch('/notifications/:id/archive', notificationsController.adminArchive);

module.exports = router;
