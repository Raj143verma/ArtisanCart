import { asyncHandler } from '../utils/asyncHandler.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';
import { AdminDashboardService } from '../services/adminDashboard.service.js';

export const getMarketplaceOverview = asyncHandler(async (req, res) => {
  const data = await AdminDashboardService.getMarketplaceOverview();
  return res.json(createSuccessResponse(data, 'Marketplace overview metrics retrieved successfully'));
});

export const getCatalogMetrics = asyncHandler(async (req, res) => {
  const data = await AdminDashboardService.getCatalogMetrics();
  return res.json(createSuccessResponse(data, 'Catalog dashboard metrics retrieved successfully'));
});

export const getOrdersMetrics = asyncHandler(async (req, res) => {
  const data = await AdminDashboardService.getOrdersMetrics();
  return res.json(createSuccessResponse(data, 'Orders dashboard metrics retrieved successfully'));
});

export const getRevenueMetrics = asyncHandler(async (req, res) => {
  const data = await AdminDashboardService.getRevenueMetrics();
  return res.json(createSuccessResponse(data, 'Revenue dashboard metrics retrieved successfully'));
});

export const getStoreDashboard = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const data = await AdminDashboardService.getStoreDashboard(limit);
  return res.json(createSuccessResponse(data, 'Store dashboard metrics retrieved successfully'));
});

export const getAnalyticsTrends = asyncHandler(async (req, res) => {
  const { startDate, endDate, timezone } = req.query;
  const data = await AdminDashboardService.getAnalyticsTrends(startDate, endDate, timezone);
  return res.json(createSuccessResponse(data, 'Analytics trends retrieved successfully'));
});
