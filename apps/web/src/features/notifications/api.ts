import { api } from '@/lib/api';
import { toFrontendNotification } from '@/lib/backend';

interface BackendNotification {
  _id?: string;
  id?: string;
  title: string;
  message?: string;
  type?: string;
  read?: boolean;
  data?: Record<string, unknown>;
  createdAt?: string;
}

export async function fetchNotifications(unreadOnly = false) {
  const res = await api.get<{ items: BackendNotification[] }>('/api/notifications', {
    unreadOnly: unreadOnly || undefined,
    limit: 100,
  });
  return { items: res.items.map(toFrontendNotification) };
}

export function markNotificationRead(id: string) {
  return api.patch(`/api/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return api.post('/api/notifications/read-all');
}
