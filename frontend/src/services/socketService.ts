import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/config/api';
import { normalizeNotification } from '@/services/notificationService';
import type { Notification } from '@/types';

const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let notificationSocket: Socket | null = null;

export const connectNotificationSocket = (
  token: string,
  onNotification: (notification: Notification) => void
) => {
  if (notificationSocket) {
    notificationSocket.disconnect();
  }

  notificationSocket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  const handleNotification = (notification: Notification) => {
    onNotification(normalizeNotification(notification));
  };

  notificationSocket.on('new_notification', handleNotification);

  return () => {
    notificationSocket?.off('new_notification', handleNotification);
    notificationSocket?.disconnect();
    notificationSocket = null;
  };
};
