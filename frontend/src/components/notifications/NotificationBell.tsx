import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { notificationService } from '@/services/notificationService';
import { connectNotificationSocket } from '@/services/socketService';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

const notificationId = (notification: Notification) => notification.id || notification._id || '';

const formatTime = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const senderName = (notification: Notification) => {
  if (notification.sender) return notification.sender.full_name || notification.sender.email;
  if (typeof notification.sender_id === 'object') return notification.sender_id.full_name || notification.sender_id.email;
  return 'Hệ thống';
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        const data = await notificationService.getNotifications(token);
        if (active) setNotifications(data);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadNotifications();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    return connectNotificationSocket(token, (notification) => {
      setNotifications((current) => {
        const id = notificationId(notification);
        if (id && current.some((item) => notificationId(item) === id)) return current;
        return [notification, ...current].slice(0, 50);
      });
    });
  }, [token]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const markReadLocally = (updated: Notification) => {
    setNotifications((current) => current.map((item) => (
      notificationId(item) === notificationId(updated) ? updated : item
    )));
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!token) return;

    const id = notificationId(notification);
    if (id && !notification.is_read) {
      try {
        const updated = await notificationService.markRead(id, token);
        markReadLocally(updated);
      } catch {
        setNotifications((current) => current.map((item) => (
          notificationId(item) === id ? { ...item, is_read: true } : item
        )));
      }
    }

    setOpen(false);
    if (notification.link_to) {
      navigate(notification.link_to);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token || unreadCount === 0) return;

    try {
      setIsMarkingAll(true);
      await notificationService.markAllRead(token);
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Thông báo</h3>
            <p className="text-xs text-muted-foreground">{unreadCount} chưa đọc</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={unreadCount === 0 || isMarkingAll}
            onClick={handleMarkAllRead}
          >
            {isMarkingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Đã đọc
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tải
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Chưa có thông báo.</div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notificationId(notification)}
                type="button"
                onClick={() => void handleNotificationClick(notification)}
                className={cn(
                  'flex w-full gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-accent/60',
                  !notification.is_read && 'bg-emerald-50/60'
                )}
              >
                <span className={cn(
                  'mt-1 h-2 w-2 shrink-0 rounded-full',
                  notification.is_read ? 'bg-transparent' : 'bg-red-600'
                )} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{notification.title}</span>
                  <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                    {senderName(notification)}: {notification.body}
                  </span>
                  <span className="mt-1 block text-[11px] font-medium text-slate-400">
                    {formatTime(notification.createdAt)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
