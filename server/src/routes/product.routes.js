import express from 'express';
import * as controller from '../controllers/product.controller.js';
import * as variantController from '../controllers/productVariant.controller.js';
import * as inventoryController from '../controllers/inventory.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateRequest, validateQuery } from '../validators/validator.js';
import { createProductSchema, updateProductSchema, listProductQuerySchema } from '../validators/product.validator.js';
import { createVariantSchema, updateVariantSchema } from '../validators/productVariant.validator.js';
import { adjustInventorySchema, restockInventorySchema, thresholdInventorySchema } from '../validators/inventory.validator.js';
import { singleUpload, multipleUpload } from '../middleware/upload/uploadMiddleware.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// Public Routes
router.get('/', validateQuery(listProductQuerySchema), controller.listProducts);
router.get('/:id', optionalAuthMiddleware, controller.getProduct);
router.get('/:id/images', optionalAuthMiddleware, controller.listProductImages);
router.get('/:id/variants', optionalAuthMiddleware, variantController.listVariants);
router.get('/:id/variants/:variantId', optionalAuthMiddleware, variantController.getVariant);
router.get('/:id/variants/:variantId/inventory', optionalAuthMiddleware, inventoryController.getInventory);

// Protected Routes (requires authenticated user)
router.use(authMiddleware);

// Seller Routes
router.get('/my', roleMiddleware(Roles.SELLER), validateQuery(listProductQuerySchema), controller.listMyProducts);
router.post('/', roleMiddleware(Roles.SELLER), validateRequest(createProductSchema), controller.createProduct);

// Admin Routes
router.get('/admin', roleMiddleware(Roles.SUPER_ADMIN), validateQuery(listProductQuerySchema), controller.listAdminProducts);

// Shared Routes for Seller and Admin (ownership is checked at service layer)
router.put('/:id', validateRequest(updateProductSchema), controller.updateProduct);
router.delete('/:id', controller.deleteProduct);
router.post('/:id/restore', controller.restoreProduct);

// Image Management Routes (Seller or Admin)
router.post('/:id/images', multipleUpload('files', 10, 'products'), controller.uploadProductImages);
router.put('/:id/images/:imageId', singleUpload('file', 'products'), controller.replaceProductImage);
router.delete('/:id/images/:imageId', controller.deleteProductImage);
router.put('/:id/images/:imageId/thumbnail', controller.setProductThumbnail);

// Variant Management Routes (Seller or Admin)
router.post('/:id/variants', roleMiddleware(Roles.SELLER), validateRequest(createVariantSchema), variantController.createVariant);
router.put('/:id/variants/:variantId', validateRequest(updateVariantSchema), variantController.updateVariant);
router.delete('/:id/variants/:variantId', variantController.deleteVariant);
router.post('/:id/variants/:variantId/restore', variantController.restoreVariant);
router.put('/:id/variants/:variantId/active', variantController.toggleActiveVariant);

// Inventory Management Routes (Seller or Admin)
router.post('/:id/variants/:variantId/inventory/adjust', roleMiddleware(Roles.SELLER), validateRequest(adjustInventorySchema), inventoryController.adjustInventory);
router.post('/:id/variants/:variantId/inventory/restock', roleMiddleware(Roles.SELLER), validateRequest(restockInventorySchema), inventoryController.restockInventory);
router.put('/:id/variants/:variantId/inventory/threshold', roleMiddleware(Roles.SELLER), validateRequest(thresholdInventorySchema), inventoryController.setLowStockThreshold);

export default router;
