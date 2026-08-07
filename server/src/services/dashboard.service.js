import { Store } from '../models/store.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';
import { DashboardRepository } from '../repositories/dashboard.repository.js';

async function resolveStoreAndSeller(userId, userRole, queryStoreId) {
  if (userRole === Roles.SUPER_ADMIN) {
    if (!queryStoreId) {
      throw new ApiError(400, 'storeId is required for Super Admin monitoring.');
    }
    const store = await Store.findById(queryStoreId);
    if (!store) {
      throw new ApiError(404, 'Store not found.');
    }
    return { storeId: store._id, sellerUserId: store.owner };
  }

  // Seller flow
  const store = await Store.findOne({ owner: userId, deletedAt: null });
  if (!store) {
    throw new ApiError(404, 'Store not found. You must create a store first.');
  }

  return { storeId: store._id, sellerUserId: store.owner };
}

export const DashboardService = {
  getOverview: async (userId, userRole, queryStoreId) => {
    const { storeId, sellerUserId } = await resolveStoreAndSeller(userId, userRole, queryStoreId);

    const [products, orders, sales] = await Promise.all([
      DashboardRepository.getOverviewMetrics(storeId),
      DashboardRepository.getOrdersMetrics(sellerUserId),
      DashboardRepository.getSalesMetrics(sellerUserId, storeId)
    ]);

    return {
      products,
      orders,
      sales
    };
  },

  getOrdersDetails: async (userId, userRole, queryStoreId) => {
    const { sellerUserId } = await resolveStoreAndSeller(userId, userRole, queryStoreId);
    return DashboardRepository.getOrdersMetrics(sellerUserId);
  },

  getSalesDetails: async (userId, userRole, queryStoreId) => {
    const { storeId, sellerUserId } = await resolveStoreAndSeller(userId, userRole, queryStoreId);
    return DashboardRepository.getSalesMetrics(sellerUserId, storeId);
  },

  getInventorySummary: async (userId, userRole, queryStoreId) => {
    const { storeId } = await resolveStoreAndSeller(userId, userRole, queryStoreId);
    return DashboardRepository.getInventoryMetrics(storeId);
  },

  getInventoryAlerts: async (userId, userRole, queryStoreId, type, page, limit) => {
    const { storeId } = await resolveStoreAndSeller(userId, userRole, queryStoreId);
    return DashboardRepository.getInventoryAlerts(storeId, type, page, limit);
  },

  getProductPerformance: async (userId, userRole, queryStoreId, filter, page, limit) => {
    const { storeId, sellerUserId } = await resolveStoreAndSeller(userId, userRole, queryStoreId);
    return DashboardRepository.getProductPerformance(storeId, sellerUserId, filter, page, limit);
  },

  getAnalyticsTrends: async (userId, userRole, queryStoreId, startDate, endDate, timezone) => {
    const { sellerUserId } = await resolveStoreAndSeller(userId, userRole, queryStoreId);
    
    // Ensure date validations and parse
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiError(400, 'Invalid startDate or endDate format.');
    }
    if (start > end) {
      throw new ApiError(400, 'startDate cannot be after endDate.');
    }

    const trends = await DashboardRepository.getAnalyticsTrends(sellerUserId, startDate, endDate, timezone);
    return { trends };
  }
};
