import { NotificationRepository } from '../repositories/notification.repository.js';
import { ApiError } from '../utils/ApiError.js';

export const NotificationService = {
  sendNotification: async (userId, payload, session = null) => {
    const { type, title, message, metadata = {} } = payload;
    return NotificationRepository.create(
      {
        user: userId,
        type: type || 'system',
        title,
        message,
        metadata,
        isRead: false,
      },
      session
    );
  },

  markAsRead: async (userId, notificationId) => {
    const notification = await NotificationRepository.findById(notificationId);
    if (!notification) {
      throw new ApiError(404, 'Notification not found.');
    }

    if (String(notification.user) !== String(userId)) {
      throw new ApiError(403, 'Unauthorized access to this notification.');
    }

    notification.isRead = true;
    return notification.save();
  },

  markAllAsRead: async (userId) => {
    return NotificationRepository.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );
  },

  deleteNotification: async (userId, notificationId) => {
    const notification = await NotificationRepository.findById(notificationId);
    if (!notification) {
      throw new ApiError(404, 'Notification not found.');
    }

    if (String(notification.user) !== String(userId)) {
      throw new ApiError(403, 'Unauthorized access to this notification.');
    }

    await NotificationRepository.deleteById(notificationId);
    return true;
  },
};
