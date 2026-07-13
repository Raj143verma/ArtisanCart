import express from 'express';
import * as controller from '../controllers/category.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateRequest, validateQuery } from '../validators/validator.js';
import { createCategorySchema, updateCategorySchema, listQuerySchema } from '../validators/category.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// Public
router.get('/', validateQuery(listQuerySchema), controller.listCategories);
router.get('/tree', controller.getCategoryTree);
router.get('/:id', controller.getCategory);

// Protected admin routes (only Super Admin can manage categories)
router.post('/', authMiddleware, roleMiddleware(Roles.SUPER_ADMIN), validateRequest(createCategorySchema), controller.createCategory);
router.put('/:id', authMiddleware, roleMiddleware(Roles.SUPER_ADMIN), validateRequest(updateCategorySchema), controller.updateCategory);
router.delete('/:id', authMiddleware, roleMiddleware(Roles.SUPER_ADMIN), controller.deleteCategory);
router.post('/:id/restore', authMiddleware, roleMiddleware(Roles.SUPER_ADMIN), controller.restoreCategory);
router.post('/:id/feature', authMiddleware, roleMiddleware(Roles.SUPER_ADMIN), controller.toggleFeatured);
router.post('/:id/active', authMiddleware, roleMiddleware(Roles.SUPER_ADMIN), controller.toggleActive);

export default router;
