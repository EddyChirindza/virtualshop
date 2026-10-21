const { Router } = require('express');
const controller = require('./users.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

const router = Router();

router.use(requireAuth);
router.get('/me', controller.getProfile);
router.patch('/me', controller.updateProfile);
router.post('/me/photo', controller.updateProfilePhoto);
router.patch('/me/password', controller.updatePassword);
router.get('/me/stats', controller.getStats);
router.get('/me/addresses', controller.listAddresses);
router.post('/me/addresses', controller.createAddress);
router.patch('/me/addresses/:id/default', controller.setDefaultAddress);
router.patch('/me/addresses/:id', controller.updateAddress);
router.delete('/me/addresses/:id', controller.deleteAddress);

module.exports = router;
