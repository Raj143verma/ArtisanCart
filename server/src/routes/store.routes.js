import express from 'express';
import * as controller from '../controllers/store.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateRequest, validateQuery } from '../validators/validator.js';
import { createStoreSchema, updateStoreSchema, listStoresQuerySchema, rejectStoreSchema } from '../validators/store.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// Seller Specific Routes
router.get('/my', authMiddleware, roleMiddleware(Roles.SELLER), controller.getMyStore);

// Public Routes
router.get('/', optionalAuthMiddleware, validateQuery(listStoresQuerySchema), controller.listStores);
router.get('/:slugOrId', optionalAuthMiddleware, controller.getStore);

// Protected Routes
router.use(authMiddleware);

// Seller & Admin Common Routes (ownership checked at Service layer)
router.post('/', roleMiddleware(Roles.SELLER), validateRequest(createStoreSchema), controller.createStore);
router.patch('/:id', roleMiddleware(Roles.SELLER), validateRequest(updateStoreSchema), controller.updateStore);
router.post('/:id/submit', roleMiddleware(Roles.SELLER), controller.submitStoreForApproval);
router.delete('/:id', roleMiddleware(Roles.SELLER), controller.deleteStore);

// Admin Only Routes
router.post('/:id/approve', roleMiddleware(Roles.SUPER_ADMIN), controller.approveStore);
router.post('/:id/reject', roleMiddleware(Roles.SUPER_ADMIN), validateRequest(rejectStoreSchema), controller.rejectStore);
router.post('/:id/suspend', roleMiddleware(Roles.SUPER_ADMIN), controller.suspendStore);
router.post('/:id/unsuspend', roleMiddleware(Roles.SUPER_ADMIN), controller.unsuspendStore);
router.post('/:id/restore', roleMiddleware(Roles.SUPER_ADMIN), controller.restoreStore);

export default router;
