import express from 'express';
import * as controller from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateQuery } from '../validators/validator.js';
import {
  overviewQuerySchema,
  ordersQuerySchema,
  salesQuerySchema,
  inventoryAlertsQuerySchema,
  productPerformanceQuerySchema,
  analyticsQuerySchema,
} from '../validators/dashboard.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// All dashboard endpoints require authentication
router.use(authMiddleware);

// Only Sellers and Super Admins can access (role hierarchy: Customer < Seller < Super Admin)
router.use(roleMiddleware(Roles.SELLER));

router.get('/overview', validateQuery(overviewQuerySchema), controller.getOverview);
router.get('/orders', validateQuery(ordersQuerySchema), controller.getOrdersDetails);
router.get('/sales', validateQuery(salesQuerySchema), controller.getSalesDetails);
router.get('/inventory', validateQuery(overviewQuerySchema), controller.getInventorySummary);
router.get('/inventory/alerts', validateQuery(inventoryAlertsQuerySchema), controller.getInventoryAlerts);
router.get('/products/performance', validateQuery(productPerformanceQuerySchema), controller.getProductPerformance);
router.get('/analytics', validateQuery(analyticsQuerySchema), controller.getAnalyticsTrends);

export default router;
