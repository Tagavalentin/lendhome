import { api } from '@/lib/api';
import type { Notification } from '@plateforme/shared';

export function fetchNotifications(unreadOnly = false) {
  return api.get<{ items: Notification[] }>('/api/notifications', {
    unread: unreadOnly || undefined,
  });
}

export function markNotificationRead(id: string) {
  return api.post(`/api/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return api.post('/api/notifications/read-all');
}
