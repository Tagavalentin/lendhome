import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { connectSocket, type ConnectionStatus, type SocketClient } from '@/lib/socket';
import { toast } from '@/stores/ui';
import type { Notification, SocketEventPayload } from '@plateforme/shared';

// Branche feature/web-realtime : écoute les événements Socket.IO et invalide
// les caches TanStack Query. Après reconnexion, les données sont rechargées
// via l'API (invalidation complète des queries).

function invalidateForEvent(qc: ReturnType<typeof useQueryClient>, payload: SocketEventPayload) {
  switch (payload.event) {
    case 'reservation.created':
    case 'reservation.updated':
    case 'reservation.cancelled':
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
      qc.invalidateQueries({ queryKey: ['resources'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      break;
    case 'loan.updated':
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      break;
    case 'notification.created': {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      const notif = payload.data.notification as Notification | undefined;
      if (notif) {
        toast('info', notif.title, notif.body);
      }
      break;
    }
  }
}

export function useRealtime(): ConnectionStatus {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const socketRef = useRef<SocketClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    if (!isAuthenticated || !user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
      return;
    }
    const socket = connectSocket(user);
    socketRef.current = socket;

    const unsubStatus = socket.subscribeStatus(setStatus);
    const unsubAll = socket.on('*', (payload) => invalidateForEvent(qc, payload));

    // Après (re)connexion : recharger toutes les données via l'API.
    let wasConnected = false;
    const unsubStatusReload = socket.subscribeStatus((s) => {
      if (s === 'connected') {
        if (wasConnected) qc.invalidateQueries();
        wasConnected = true;
      }
    });

    return () => {
      unsubStatus();
      unsubStatusReload();
      unsubAll();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user, qc]);

  return status;
}
