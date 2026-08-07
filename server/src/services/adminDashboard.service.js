import { ApiError } from '../utils/ApiError.js';
import { AdminDashboardRepository } from '../repositories/adminDashboard.repository.js';

export const AdminDashboardService = {
  getMarketplaceOverview: async () => {
    return AdminDashboardRepository.getMarketplaceOverview();
  },

  getCatalogMetrics: async () => {
    return AdminDashboardRepository.getCatalogMetrics();
  },

  getOrdersMetrics: async () => {
    return AdminDashboardRepository.getOrdersMetrics();
  },

  getRevenueMetrics: async () => {
    return AdminDashboardRepository.getRevenueMetrics();
  },

  getStoreDashboard: async (limit) => {
    const lim = parseInt(limit) || 5;
    return AdminDashboardRepository.getStoreDashboard(lim);
  },

  getAnalyticsTrends: async (startDate, endDate, timezone = 'UTC') => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiError(400, 'Invalid startDate or endDate format.');
    }
    if (start > end) {
      throw new ApiError(400, 'startDate cannot be after endDate.');
    }

    return AdminDashboardRepository.getAnalyticsTrends(startDate, endDate, timezone);
  }
};
