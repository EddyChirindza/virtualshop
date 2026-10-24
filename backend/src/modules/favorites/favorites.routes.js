const { Router } = require('express');
const controller = require('./favorites.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

const router = Router();

router.use(requireAuth);
router.get('/', controller.list);
router.post('/', controller.add);
router.get('/:productId', controller.getOne);
router.delete('/:productId', controller.remove);

module.exports = router;
