import { asyncHandler } from '../utils/asyncHandler.js';
import { InventoryService } from '../services/inventory.service.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';

export const getInventory = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const inventory = await InventoryService.getInventory(variantId);
  return res.json(createSuccessResponse(inventory, 'Inventory retrieved successfully'));
});

export const adjustInventory = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const { adjustment } = req.body;
  const userId = req.user._id;
  const role = req.user.role;

  const inventory = await InventoryService.adjustInventory(variantId, adjustment, userId, role);
  return res.json(createSuccessResponse(inventory, 'Inventory adjusted successfully'));
});

export const restockInventory = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const { quantity } = req.body;
  const userId = req.user._id;
  const role = req.user.role;

  const inventory = await InventoryService.restockInventory(variantId, quantity, userId, role);
  return res.json(createSuccessResponse(inventory, 'Inventory restocked successfully'));
});

export const setLowStockThreshold = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const { threshold } = req.body;
  const userId = req.user._id;
  const role = req.user.role;

  const inventory = await InventoryService.setLowStockThreshold(variantId, threshold, userId, role);
  return res.json(createSuccessResponse(inventory, 'Low stock threshold updated successfully'));
});
