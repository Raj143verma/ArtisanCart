import { asyncHandler } from '../utils/asyncHandler.js';
import { ProductService } from '../services/product.service.js';
import { Store } from '../models/store.model.js';
import { createSuccessResponse, createErrorResponse } from '../helpers/responseHelper.js';
import { Roles } from '../constants/roles.js';

export const createProduct = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const product = await ProductService.create(req.body, userId);
  return res.status(201).json(createSuccessResponse(product, 'Product created successfully'));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user._id;
  const role = req.user.role;
  const updated = await ProductService.update(id, req.body, userId, role);
  return res.json(createSuccessResponse(updated, 'Product updated successfully'));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user._id;
  const role = req.user.role;
  const result = await ProductService.softDelete(id, userId, role);
  if (!result) {
    return res.status(404).json(createErrorResponse('Product not found.'));
  }
  return res.json(createSuccessResponse(null, 'Product deleted successfully'));
});

export const restoreProduct = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user._id;
  const role = req.user.role;
  const result = await ProductService.restore(id, userId, role);
  if (!result) {
    return res.status(404).json(createErrorResponse('Product not found.'));
  }
  return res.json(createSuccessResponse(null, 'Product restored successfully'));
});

export const getProduct = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const product = await ProductService.getById(id);
  if (!product) {
    return res.status(404).json(createErrorResponse('Product not found.'));
  }

  // Visibility checks: draft or other non-published products
  // must only be viewable by the store owner or admin.
  if (product.status !== 'published') {
    const user = req.user; // Populated optionally by optionalAuthMiddleware
    if (!user) {
      return res.status(404).json(createErrorResponse('Product not found.'));
    }
    
    if (user.role !== Roles.SUPER_ADMIN) {
      const store = await Store.findOne({ owner: user._id });
      if (!store || String(product.store) !== String(store._id)) {
        return res.status(404).json(createErrorResponse('Product not found.'));
      }
    }
  }

  return res.json(createSuccessResponse(product, 'Product retrieved successfully'));
});

export const listProducts = asyncHandler(async (req, res) => {
  const { q, slug, featured, active, category, store, minPrice, maxPrice, tags, page, limit, sort } = req.query;
  
  // Public listing route only returns published and active products.
  const query = {
    q,
    slug,
    featured,
    active: typeof active !== 'undefined' ? active : true,
    status: 'published',
    category,
    store,
    minPrice,
    maxPrice,
    tags,
  };

  const result = await ProductService.list(query, { page, limit, sort });
  return res.json(createSuccessResponse(result.docs, 'Products listed successfully', {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
  }));
});

export const listMyProducts = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const store = await Store.findOne({ owner: userId });
  if (!store) {
    return res.status(404).json(createErrorResponse('Store not found. You must create a store first.'));
  }

  const { q, slug, featured, active, status, category, minPrice, maxPrice, tags, page, limit, sort } = req.query;
  
  // Sellers can view all their products (draft, published, pending_review, etc.)
  const query = {
    q,
    slug,
    featured,
    active,
    status,
    category,
    store: store._id,
    minPrice,
    maxPrice,
    tags,
  };

  const result = await ProductService.list(query, { page, limit, sort });
  return res.json(createSuccessResponse(result.docs, 'My products listed successfully', {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
  }));
});

export const listAdminProducts = asyncHandler(async (req, res) => {
  const { q, slug, featured, active, status, category, store, minPrice, maxPrice, tags, page, limit, sort } = req.query;
  
  // Admins can list all products across the platform with any status.
  const query = {
    q,
    slug,
    featured,
    active,
    status,
    category,
    store,
    minPrice,
    maxPrice,
    tags,
  };

  const result = await ProductService.list(query, { page, limit, sort });
  return res.json(createSuccessResponse(result.docs, 'All products listed successfully for admin', {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
  }));
});

export const uploadProductImages = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user._id;
  const role = req.user.role;

  if (!req.mediaFiles || req.mediaFiles.length === 0) {
    return res.status(400).json(createErrorResponse('At least one file is required.'));
  }

  const images = await ProductService.uploadImages(id, req.mediaFiles, userId, role);
  return res.json(createSuccessResponse(images, 'Images uploaded successfully'));
});

export const deleteProductImage = asyncHandler(async (req, res) => {
  const { id, imageId } = req.params;
  const userId = req.user._id;
  const role = req.user.role;

  const images = await ProductService.deleteImage(id, imageId, userId, role);
  return res.json(createSuccessResponse(images, 'Image deleted successfully'));
});

export const replaceProductImage = asyncHandler(async (req, res) => {
  const { id, imageId } = req.params;
  const userId = req.user._id;
  const role = req.user.role;

  if (!req.media) {
    return res.status(400).json(createErrorResponse('File is required for replacement.'));
  }

  const images = await ProductService.replaceImage(id, imageId, req.media, userId, role);
  return res.json(createSuccessResponse(images, 'Image replaced successfully'));
});

export const setProductThumbnail = asyncHandler(async (req, res) => {
  const { id, imageId } = req.params;
  const userId = req.user._id;
  const role = req.user.role;

  const images = await ProductService.setThumbnail(id, imageId, userId, role);
  return res.json(createSuccessResponse(images, 'Thumbnail updated successfully'));
});

export const listProductImages = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const product = await ProductService.getById(id);
  if (!product) {
    return res.status(404).json(createErrorResponse('Product not found.'));
  }

  // Visibility checks: draft or other non-published products
  // must only be viewable by the store owner or admin.
  if (product.status !== 'published') {
    const user = req.user; // Populated optionally by optionalAuthMiddleware
    if (!user) {
      return res.status(404).json(createErrorResponse('Product not found.'));
    }

    if (user.role !== Roles.SUPER_ADMIN) {
      const store = await Store.findOne({ owner: user._id });
      if (!store || String(product.store) !== String(store._id)) {
        return res.status(404).json(createErrorResponse('Product not found.'));
      }
    }
  }

  const sortedImages = [...(product.images || [])].sort((a, b) => a.displayOrder - b.displayOrder);
  return res.json(createSuccessResponse(sortedImages, 'Product images retrieved successfully'));
});
