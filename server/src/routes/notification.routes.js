import express from 'express';
import * as controller from '../controllers/notification.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { validateQuery } from '../validators/validator.js';
import { listNotificationsSchema } from '../validators/notification.validator.js';

const router = express.Router();

// All notification routes require authentication
router.use(authMiddleware);

// List notifications (paginated and filterable)
router.get('/', validateQuery(listNotificationsSchema), controller.listNotifications);

// Mark all notifications as read for current user
router.post('/read-all', controller.markAllAsRead);

// Mark specific notification as read by ID
router.patch('/:id/read', controller.markAsRead);

// Dismiss/Delete a notification by ID
router.delete('/:id', controller.deleteNotification);

export default router;
