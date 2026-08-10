import express from 'express';
import * as controller from '../controllers/order.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateRequest } from '../validators/validator.js';
import { createOrderSchema, cancelOrderSchema, shipOrderSchema } from '../validators/order.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// All order endpoints require authentication
router.use(authMiddleware);

router.post('/', validateRequest(createOrderSchema), controller.createOrder);
router.get('/', controller.listOrders);
router.get('/:orderId', controller.getOrderById);
router.post('/:orderId/cancel', validateRequest(cancelOrderSchema), controller.cancelOrder);

// Order Fulfillment and Shipping transitions (require seller or super_admin role)
router.put('/:orderId/process', roleMiddleware(Roles.SELLER), controller.processOrder);
router.put('/:orderId/ship', roleMiddleware(Roles.SELLER), validateRequest(shipOrderSchema), controller.shipOrder);
router.put('/:orderId/deliver', roleMiddleware(Roles.SELLER), controller.deliverOrder);

export default router;
