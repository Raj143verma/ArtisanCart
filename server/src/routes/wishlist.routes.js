import express from 'express';
import * as controller from '../controllers/wishlist.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateRequest, validateQuery } from '../validators/validator.js';
import {
  addWishlistItemSchema,
  removeWishlistItemSchema,
  checkWishlistItemSchema,
  listWishlistQuerySchema,
} from '../validators/wishlist.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// All wishlist endpoints require authentication and Customer role
router.use(authMiddleware);
router.use(roleMiddleware(Roles.CUSTOMER));

router.get('/', validateQuery(listWishlistQuerySchema), controller.getWishlist);
router.post('/', validateRequest(addWishlistItemSchema), controller.addWishlistItem);
router.delete('/', validateRequest(removeWishlistItemSchema), controller.removeWishlistItem);
router.delete('/clear', controller.clearWishlist);
router.get('/check', validateQuery(checkWishlistItemSchema), controller.checkWishlistItem);

export default router;
