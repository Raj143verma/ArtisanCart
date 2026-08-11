import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { StoreService } from '../services/store.service.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';

export const createStore = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const store = await StoreService.create(req.body, userId);
  return res.status(201).json(createSuccessResponse(store, 'Store created successfully'));
});

export const updateStore = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user._id;
  const role = req.user.role;
  const updated = await StoreService.update(id, req.body, userId, role);
  return res.json(createSuccessResponse(updated, 'Store updated successfully'));
});

export const submitStoreForApproval = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user._id;
  const store = await StoreService.submitForApproval(id, userId);
  return res.json(createSuccessResponse(store, 'Store submitted for approval successfully'));
});

export const approveStore = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const store = await StoreService.approve(id, req);
  return res.json(createSuccessResponse(store, 'Store approved successfully'));
});

export const rejectStore = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { reason } = req.body;
  const store = await StoreService.reject(id, reason, req);
  return res.json(createSuccessResponse(store, 'Store rejected successfully'));
});

export const suspendStore = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const store = await StoreService.suspend(id, req);
  return res.json(createSuccessResponse(store, 'Store suspended successfully'));
});

export const unsuspendStore = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const store = await StoreService.unsuspend(id, req);
  return res.json(createSuccessResponse(store, 'Store unsuspended successfully'));
});

export const deleteStore = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user._id;
  const role = req.user.role;
  await StoreService.softDelete(id, userId, role);
  return res.json(createSuccessResponse(null, 'Store soft-deleted successfully'));
});

export const restoreStore = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const store = await StoreService.restore(id);
  return res.json(createSuccessResponse(store, 'Store restored successfully'));
});

export const getStore = asyncHandler(async (req, res) => {
  const slugOrId = req.params.slugOrId;
  const userId = req.user?._id;
  const role = req.user?.role;

  const isId = mongoose.Types.ObjectId.isValid(slugOrId);
  let store;
  if (isId) {
    store = await StoreService.getById(slugOrId, userId, role);
  } else {
    store = await StoreService.getBySlug(slugOrId, userId, role);
  }

  return res.json(createSuccessResponse(store, 'Store retrieved successfully'));
});

export const listStores = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const role = req.user?.role;
  const result = await StoreService.list(req.query, userId, role);
  return res.json(createSuccessResponse(result.items, 'Stores listed successfully', result.pagination));
});

export const getMyStore = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const store = await StoreService.getByOwner(userId);
  return res.json(createSuccessResponse(store, 'My store retrieved successfully'));
});
