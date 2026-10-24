const { Router } = require('express');
const controller = require('./order.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

const router = Router();

router.use(requireAuth);
router.post('/', controller.checkout);
router.get('/:id', controller.detail);

module.exports = router;
