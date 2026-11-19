// Client Socket.IO : utilise socket.io-client si VITE_SOCKET_URL est défini,
// sinon un mock local basé sur BroadcastChannel (permet le temps réel entre
// onglets sans backend). Les événements signalent un changement : le front
// invalide alors les caches TanStack Query et recharge via l'API.

import { io, type Socket } from 'socket.io-client';
import type { SocketEventName, SocketEventPayload, User } from '@plateforme/shared';
import { getAccessToken, USE_MOCKS } from './api';

export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? '';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

type Listener = (payload: SocketEventPayload) => void;

export interface SocketClient {
  on(event: SocketEventName | '*', listener: Listener): () => void;
  disconnect(): void;
  getStatus(): ConnectionStatus;
  subscribeStatus(listener: (s: ConnectionStatus) => void): () => void;
}

const CHANNEL_NAME = 'fablab-socket-events';

// ---------- Mock local (BroadcastChannel + event bus local) ----------

class MockSocketClient implements SocketClient {
  private listeners = new Map<string, Set<Listener>>();
  private statusListeners = new Set<(s: ConnectionStatus) => void>();
  private channel: BroadcastChannel | null = null;
  private status: ConnectionStatus = 'connected';

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (ev: MessageEvent<SocketEventPayload>) => {
        this.dispatch(ev.data);
      };
    }
  }

  on(event: SocketEventName | '*', listener: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  private dispatch(payload: SocketEventPayload) {
    this.listeners.get('*')?.forEach((l) => l(payload));
    this.listeners.get(payload.event)?.forEach((l) => l(payload));
  }

  /** Émet un événement (utilisé par les handlers MSW pour simuler le serveur). */
  emit(payload: SocketEventPayload) {
    this.dispatch(payload);
    this.channel?.postMessage(payload);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  subscribeStatus(listener: (s: ConnectionStatus) => void) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  disconnect() {
    this.channel?.close();
    this.channel = null;
  }
}

export const mockSocket = new MockSocketClient();

// Permet aux handlers MSW d'émettre des événements temps réel.
export function emitMockSocketEvent(event: SocketEventName, data: Record<string, unknown>) {
  mockSocket.emit({ event, data, at: new Date().toISOString() });
}

// ---------- Client réel ----------

class RealSocketClient implements SocketClient {
  private socket: Socket;
  private listeners = new Map<string, Set<Listener>>();
  private statusListeners = new Set<(s: ConnectionStatus) => void>();
  private status: ConnectionStatus = 'disconnected';

  constructor(user: User | null) {
    const token = getAccessToken();
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    const events: SocketEventName[] = [
      'reservation.created',
      'reservation.updated',
      'reservation.cancelled',
      'loan.updated',
      'notification.created',
    ];
    events.forEach((e) =>
      this.socket.on(e, (data: Record<string, unknown>) =>
        this.dispatch({ event: e, data, at: new Date().toISOString() }),
      ),
    );
    this.socket.on('connect', () => this.setStatus('connected'));
    this.socket.on('disconnect', () => this.setStatus('reconnecting'));
    this.socket.on('connect_error', () => this.setStatus('reconnecting'));
    void user;
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  private dispatch(payload: SocketEventPayload) {
    this.listeners.get('*')?.forEach((l) => l(payload));
    this.listeners.get(payload.event)?.forEach((l) => l(payload));
  }

  on(event: SocketEventName | '*', listener: Listener) {
    this.socket.on(event, (data: Record<string, unknown>) =>
      listener({ event: event as SocketEventName, data, at: new Date().toISOString() }),
    );
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => {
      this.socket.off(event);
      this.listeners.get(event)?.delete(listener);
    };
  }

  getStatus() {
    return this.status;
  }

  subscribeStatus(listener: (s: ConnectionStatus) => void) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

let current: SocketClient | null = null;

export function connectSocket(user: User | null): SocketClient {
  current?.disconnect();
  current = SOCKET_URL && !USE_MOCKS ? new RealSocketClient(user) : mockSocket;
  return current;
}

export function getSocket(): SocketClient {
  return current ?? mockSocket;
}
