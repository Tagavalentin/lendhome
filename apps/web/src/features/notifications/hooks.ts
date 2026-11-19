import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from './api';
import { toast } from '@/stores/ui';

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', unreadOnly ? 'unread' : 'all'],
    queryFn: () => fetchNotifications(unreadOnly),
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  const { data } = useNotifications(true);
  return data?.items.length ?? 0;
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast('error', 'Impossible de tout marquer comme lu'),
  });
}
