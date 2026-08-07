import { asyncHandler } from '../utils/asyncHandler.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';
import { DashboardService } from '../services/dashboard.service.js';

export const getOverview = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { storeId } = req.query;

  const data = await DashboardService.getOverview(userId, role, storeId);
  return res.json(createSuccessResponse(data, 'Dashboard overview retrieved successfully'));
});

export const getOrdersDetails = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { storeId } = req.query;

  const data = await DashboardService.getOrdersDetails(userId, role, storeId);
  return res.json(createSuccessResponse(data, 'Orders dashboard metrics retrieved successfully'));
});

export const getSalesDetails = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { storeId } = req.query;

  const data = await DashboardService.getSalesDetails(userId, role, storeId);
  return res.json(createSuccessResponse(data, 'Sales dashboard metrics retrieved successfully'));
});

export const getInventorySummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { storeId } = req.query;

  const data = await DashboardService.getInventorySummary(userId, role, storeId);
  return res.json(createSuccessResponse(data.inventorySummary, 'Inventory summary retrieved successfully'));
});

export const getInventoryAlerts = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { storeId, type, page, limit } = req.query;

  const result = await DashboardService.getInventoryAlerts(
    userId,
    role,
    storeId,
    type,
    parseInt(page) || 1,
    parseInt(limit) || 10
  );
  return res.json(createSuccessResponse(result.items, 'Inventory alerts retrieved successfully', result.pagination));
});

export const getProductPerformance = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { storeId, filter, page, limit } = req.query;

  const result = await DashboardService.getProductPerformance(
    userId,
    role,
    storeId,
    filter,
    parseInt(page) || 1,
    parseInt(limit) || 5
  );
  return res.json(createSuccessResponse(result.items, 'Product performance metrics retrieved successfully', result.pagination));
});

export const getAnalyticsTrends = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { storeId, startDate, endDate, timezone } = req.query;

  const data = await DashboardService.getAnalyticsTrends(userId, role, storeId, startDate, endDate, timezone);
  return res.json(createSuccessResponse(data.trends, 'Analytics trends retrieved successfully'));
});
