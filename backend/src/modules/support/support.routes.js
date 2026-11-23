const { Router } = require('express');
const controller = require('./support.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');

const router = Router();

router.get('/conversation', requireAuth, requireRole('customer'), controller.customerConversation);
router.post('/messages', requireAuth, requireRole('customer'), controller.customerMessage);
router.post('/conversation/request-agent', requireAuth, requireRole('customer'), controller.requestAgent);

router.use('/agent', requireAuth, requireRole('admin', 'support'));
router.get('/agent/conversations', controller.agentConversations);
router.get('/agent/conversations/:id', controller.agentConversation);
router.post('/agent/conversations/:id/claim', controller.claimConversation);
router.post('/agent/conversations/:id/messages', controller.agentMessage);
router.post('/agent/conversations/:id/close', controller.closeConversation);

module.exports = router;
