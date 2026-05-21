import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/config/api';
import { normalizeNotification } from '@/services/notificationService';
import type { Notification, Comment } from '@/types';

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

/**
 * Real-time task communication: comments, mentions, typing
 */
export const connectTaskSocket = (
  taskId: string,
  token: string,
  callbacks: {
    onNewComment?: (comment: Comment) => void;
    onTyping?: (data: { userId: string; userName: string; isTyping: boolean }) => void;
    onMention?: (notification: any) => void;
  }
) => {
  if (!notificationSocket) {
    notificationSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }

  // Join task room
  notificationSocket.emit('join_task', taskId);

  // Listen for new comments
  if (callbacks.onNewComment) {
    notificationSocket.on('new_comment', callbacks.onNewComment);
  }

  // Listen for typing indicators
  if (callbacks.onTyping) {
    notificationSocket.on('user_typing', callbacks.onTyping);
  }

  // Listen for mention notifications
  if (callbacks.onMention) {
    notificationSocket.on('task_comment_notification', callbacks.onMention);
  }

  // Cleanup function
  return () => {
    notificationSocket?.emit('leave_task', taskId);
    if (callbacks.onNewComment) {
      notificationSocket?.off('new_comment', callbacks.onNewComment);
    }
    if (callbacks.onTyping) {
      notificationSocket?.off('user_typing', callbacks.onTyping);
    }
    if (callbacks.onMention) {
      notificationSocket?.off('task_comment_notification', callbacks.onMention);
    }
  };
};

/**
 * Emit typing indicator to other users in task room
 */
export const emitTypingStatus = (taskId: string, isTyping: boolean) => {
  if (!notificationSocket) return;
  if (isTyping) {
    notificationSocket.emit('typing', { taskId, isTyping: true });
  } else {
    notificationSocket.emit('stop_typing', taskId);
  }
};

export const disconnectNotificationSocket = () => {
  if (notificationSocket) {
    notificationSocket.disconnect();
    notificationSocket = null;
  }
};
