import express from 'express';
import * as controller from '../controllers/cart.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { validateRequest } from '../validators/validator.js';
import { addItemSchema, updateQuantitySchema } from '../validators/cart.validator.js';

const router = express.Router();

// All cart endpoints require user authentication
router.use(authMiddleware);

router.get('/', controller.getCart);
router.post('/items', validateRequest(addItemSchema), controller.addItem);
router.put('/items/:variantId', validateRequest(updateQuantitySchema), controller.updateQuantity);
router.delete('/items/:variantId', controller.removeItem);
router.post('/clear', controller.clearCart);

export default router;
