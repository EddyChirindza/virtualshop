const { Router } = require('express');
const controller = require('./cart.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

const router = Router();

router.use(requireAuth);
router.get('/', controller.get);
router.post('/items', controller.addItem);
router.patch('/items/:id', controller.updateItem);
router.delete('/items/:id', controller.removeItem);
router.delete('/', controller.clear);

module.exports = router;
