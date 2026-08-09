import { asyncHandler } from '../utils/asyncHandler.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';
import { NotificationService } from '../services/notification.service.js';
import { NotificationRepository } from '../repositories/notification.repository.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { isRead, type, page = 1, limit = 20 } = req.query;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const parsedLimit = parseInt(limit, 10);

  let filter = { user: userId };

  if (typeof isRead !== 'undefined') {
    // Joi casted string to boolean automatically
    filter.isRead = isRead;
  }
  if (type) {
    filter.type = type;
  }

  const list = await NotificationRepository.list(filter, { skip, limit: parsedLimit });
  const total = await NotificationRepository.count(filter);
  const unreadCount = await NotificationRepository.count({ user: userId, isRead: false });

  return res.json(
    createSuccessResponse(
      { list, total, unreadCount, page: parseInt(page, 10), limit: parsedLimit },
      'Notifications listed successfully.'
    )
  );
});

export const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const notificationId = req.params.id;

  const updated = await NotificationService.markAsRead(userId, notificationId);
  return res.json(createSuccessResponse(updated, 'Notification marked as read.'));
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await NotificationService.markAllAsRead(userId);
  return res.json(createSuccessResponse(null, 'All notifications marked as read.'));
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const notificationId = req.params.id;

  await NotificationService.deleteNotification(userId, notificationId);
  return res.json(createSuccessResponse(null, 'Notification dismissed/deleted.'));
});
