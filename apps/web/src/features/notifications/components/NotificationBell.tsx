import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications, useMarkAllRead, useMarkRead, useUnreadCount } from '../hooks';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();
  const { data } = useNotifications(false);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const recent = (data?.items ?? []).slice(0, 6);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openNotification = (id: string, link?: string, read?: boolean) => {
    if (!read) markRead.mutate(id);
    setOpen(false);
    if (link) navigate(link);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} non lues` : ''}`}
        aria-expanded={open}
        className="relative rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs text-brand-600 hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
          <ul className="max-h-96 divide-y divide-gray-50 overflow-y-auto">
            {recent.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-500">Aucune notification</li>
            )}
            {recent.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => openNotification(n.id, n.link, n.read)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-gray-50',
                    !n.read && 'bg-brand-50/60',
                  )}
                >
                  <span className="flex items-center gap-2">
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Non lue" />
                    )}
                    <span className="text-sm font-medium text-gray-900">{n.title}</span>
                  </span>
                  <span className="line-clamp-2 text-xs text-gray-600">{n.body}</span>
                  <span className="text-[11px] text-gray-400">{formatDateTime(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-100 px-4 py-2">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-sm text-brand-600 hover:underline"
            >
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationsPage() {
  const { data, isLoading } = useNotifications(false);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const navigate = useNavigate();

  if (isLoading) return <p className="py-10 text-center text-gray-500">Chargement…</p>;
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {items.some((n) => !n.read) && (
          <Button variant="secondary" size="sm" onClick={() => markAll.mutate()}>
            Tout marquer comme lu
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-500">
          Aucune notification pour le moment.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {items.map((n) => (
            <li key={n.id} className={cn('px-4 py-3', !n.read && 'bg-brand-50/50')}>
              <button
                className="flex w-full flex-col gap-1 text-left"
                onClick={() => {
                  if (!n.read) markRead.mutate(n.id);
                  if (n.link) navigate(n.link);
                }}
              >
                <span className="flex items-center gap-2">
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden="true" />
                  )}
                  <span className="font-medium text-gray-900">{n.title}</span>
                </span>
                <span className="text-sm text-gray-600">{n.body}</span>
                <span className="text-xs text-gray-400">{formatDateTime(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
