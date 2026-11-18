const { Router } = require('express');
const controller = require('./banner.controller');

const router = Router();
router.get('/', controller.list);

module.exports = router;
