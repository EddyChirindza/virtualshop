const { Router } = require('express');
const controller = require('./notifications.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');

const router = Router();
router.use(requireAuth, requireRole('customer'));
router.get('/unread-count', controller.unreadCount);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);
router.get('/', controller.list);

module.exports = router;
