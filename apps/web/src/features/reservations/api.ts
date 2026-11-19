import { api } from '@/lib/api';
import type {
  Reservation,
  ReservationCreateInput,
  ReservationUpdateInput,
} from '@plateforme/shared';

export function fetchReservations(params: {
  resourceId?: string;
  status?: string;
  mine?: boolean;
  from?: string;
  to?: string;
}) {
  return api.get<{ items: Reservation[] }>('/api/reservations', params);
}

export function fetchReservation(id: string) {
  return api.get<Reservation>(`/api/reservations/${id}`);
}

export function createReservation(input: ReservationCreateInput) {
  return api.post<Reservation>('/api/reservations', input);
}

export function updateReservation(id: string, input: ReservationUpdateInput) {
  return api.patch<Reservation>(`/api/reservations/${id}`, input);
}

export function cancelReservation(id: string) {
  return api.post<Reservation>(`/api/reservations/${id}/cancel`);
}

export function approveReservation(id: string) {
  return api.post<Reservation>(`/api/reservations/${id}/approve`);
}

export function rejectReservation(id: string, reason?: string) {
  return api.post<Reservation>(`/api/reservations/${id}/reject`, { reason });
}
