const { Router } = require('express');
const controller = require('./payment_methods.controller');

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id/default', controller.setDefault);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
