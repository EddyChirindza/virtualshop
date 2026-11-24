// Rotas públicas de catálogo mais operações de escrita restritas a administradores.
const { Router } = require('express');
const controller = require('./product.controller');
const { searchLimiter } = require('../../middlewares/rateLimiter');
const { requireAuth, optionalAuth, requireRole } = require('../../middlewares/auth.middleware');

const router = Router();
router.get('/popular', controller.popular);
router.get('/new-arrivals', controller.newArrivals);
router.post('/', requireAuth, requireRole('admin'), controller.create);
router.get('/:id/reviews', optionalAuth, controller.reviews);
router.post('/:id/reviews', requireAuth, controller.saveReview);
router.delete('/:id/reviews', requireAuth, controller.removeReview);
router.post('/:id/reviews/:reviewId/vote', requireAuth, requireRole('customer'), controller.voteReview);
router.delete('/:id/reviews/:reviewId/vote', requireAuth, requireRole('customer'), controller.removeReviewVote);
router.get('/:id', controller.detail);
router.patch('/:id', requireAuth, requireRole('admin'), controller.update);
router.delete('/:id', requireAuth, requireRole('admin'), controller.remove);
router.get('/', searchLimiter, controller.list);
module.exports = router;
