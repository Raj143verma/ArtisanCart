import express from 'express';
import * as controller from '../controllers/adminDashboard.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateQuery } from '../validators/validator.js';
import {
  adminOverviewQuerySchema,
  adminCatalogQuerySchema,
  adminOrdersQuerySchema,
  adminRevenueQuerySchema,
  adminStoreQuerySchema,
  adminAnalyticsQuerySchema,
} from '../validators/adminDashboard.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// All admin dashboard endpoints require authentication
router.use(authMiddleware);

// Only Super Admins can access (blocked for Customer and Seller roles)
router.use(roleMiddleware(Roles.SUPER_ADMIN));

router.get('/overview', validateQuery(adminOverviewQuerySchema), controller.getMarketplaceOverview);
router.get('/catalog', validateQuery(adminCatalogQuerySchema), controller.getCatalogMetrics);
router.get('/orders', validateQuery(adminOrdersQuerySchema), controller.getOrdersMetrics);
router.get('/revenue', validateQuery(adminRevenueQuerySchema), controller.getRevenueMetrics);
router.get('/stores', validateQuery(adminStoreQuerySchema), controller.getStoreDashboard);
router.get('/analytics', validateQuery(adminAnalyticsQuerySchema), controller.getAnalyticsTrends);

export default router;
