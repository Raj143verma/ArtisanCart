import express from 'express';
import * as controller from '../controllers/order.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { validateRequest } from '../validators/validator.js';
import { createOrderSchema, cancelOrderSchema } from '../validators/order.validator.js';

const router = express.Router();

// All order endpoints require authentication
router.use(authMiddleware);

router.post('/', validateRequest(createOrderSchema), controller.createOrder);
router.get('/', controller.listOrders);
router.get('/:orderId', controller.getOrderById);
router.post('/:orderId/cancel', validateRequest(cancelOrderSchema), controller.cancelOrder);

export default router;
