import { asyncHandler } from '../utils/asyncHandler.js';
import { OrderService } from '../services/order.service.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';

export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const orders = await OrderService.createOrderFromCheckout(userId, role, req.body);
  return res.status(201).json(createSuccessResponse(orders, 'Orders placed successfully'));
});

export const getOrderById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { orderId } = req.params;
  const order = await OrderService.getOrderById(orderId, userId, role);
  return res.json(createSuccessResponse(order, 'Order retrieved successfully'));
});

export const listOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const orders = await OrderService.listOrders(userId, role);
  return res.json(createSuccessResponse(orders, 'Orders listed successfully'));
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { orderId } = req.params;
  const order = await OrderService.cancelOrder(orderId, userId, role, req.body);
  return res.json(createSuccessResponse(order, 'Order cancelled successfully'));
});
