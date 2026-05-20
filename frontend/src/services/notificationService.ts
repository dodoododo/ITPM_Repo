import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import type { ApiResponse, Notification, User } from '@/types';

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const readJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || response.statusText);
  }
  return payload;
};

export const normalizeNotification = (notification: Notification): Notification => {
  const sender = typeof notification.sender_id === 'object'
    ? notification.sender_id as User
    : notification.sender;

  return {
    ...notification,
    id: notification.id || notification._id || '',
    sender,
  };
};

export const notificationService = {
  getNotifications: async (token: string): Promise<Notification[]> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.NOTIFICATIONS.LIST), {
      headers: authHeaders(token),
    });

    const payload = await readJson<ApiResponse<Notification[]>>(response);
    return (payload.data || []).map(normalizeNotification);
  },

  markRead: async (id: string, token: string): Promise<Notification> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id)), {
      method: 'PATCH',
      headers: authHeaders(token),
    });

    const payload = await readJson<ApiResponse<Notification>>(response);
    return normalizeNotification(payload.data as Notification);
  },

  markAllRead: async (token: string): Promise<void> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ), {
      method: 'PATCH',
      headers: authHeaders(token),
    });

    await readJson<ApiResponse<{ modifiedCount: number }>>(response);
  },
};
