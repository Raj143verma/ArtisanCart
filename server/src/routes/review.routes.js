import express from 'express';
import * as controller from '../controllers/review.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { permissionMiddleware } from '../middleware/auth/permissionMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateRequest } from '../validators/validator.js';
import {
  createReviewSchema,
  updateReviewSchema,
  sellerReplySchema,
  moderateReviewSchema,
} from '../validators/review.validator.js';
import { Permissions } from '../constants/permissions.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// Authenticated routes below
router.use(authMiddleware);

router.post('/', validateRequest(createReviewSchema), controller.createReview);
router.put('/:id', validateRequest(updateReviewSchema), controller.updateReview);
router.post(
  '/:id/reply',
  roleMiddleware(Roles.SELLER),
  validateRequest(sellerReplySchema),
  controller.replyToReview
);
router.delete('/:id', controller.deleteReview);

// Moderation endpoint restricted to Admins
router.patch(
  '/:id/moderate',
  permissionMiddleware(Permissions.REVIEW_MODERATE),
  validateRequest(moderateReviewSchema),
  controller.moderateReview
);

export default router;
