import { api } from '@/lib/api';
import type {
  Reservation,
  ReservationCreateInput,
  ReservationUpdateInput,
} from '@plateforme/shared';
import { currentUserId, toFrontendReservation } from '@/lib/backend';
import type { BackendReservation } from '@/lib/backend';

export async function fetchReservations(params: {
  resourceId?: string;
  status?: string;
  mine?: boolean;
  from?: string;
  to?: string;
}) {
  const raw = await api.get<BackendReservation[]>('/api/reservations');
  const me = currentUserId();
  let items = raw.map(toFrontendReservation);

  // Filtres gérés côté client (le backend renvoie tout, avec populate).
  if (params.mine) items = items.filter((r) => r.userId === me);
  if (params.resourceId) items = items.filter((r) => r.resourceId === params.resourceId);
  if (params.status) items = items.filter((r) => r.status === params.status);
  if (params.from)
    items = items.filter((r) => new Date(r.end).getTime() > new Date(params.from!).getTime());
  if (params.to)
    items = items.filter((r) => new Date(r.start).getTime() < new Date(params.to!).getTime());

  items.sort((a, b) => a.start.localeCompare(b.start));
  return { items };
}

async function fetchOne(id: string): Promise<Reservation> {
  const r = await api.get<BackendReservation>(`/api/reservations/${id}`);
  return toFrontendReservation(r);
}

export function fetchReservation(id: string) {
  return fetchOne(id);
}

export async function createReservation(input: ReservationCreateInput) {
  const created = await api.post<BackendReservation>('/api/reservations', {
    resourceId: input.resourceId,
    startTime: input.start,
    endTime: input.end,
    title: input.title,
    purpose: input.purpose,
    participants: input.participants,
  });
  return toFrontendReservation(created);
}

export async function updateReservation(id: string, input: ReservationUpdateInput) {
  const body: Record<string, unknown> = {};
  if (input.start !== undefined) body.startTime = input.start;
  if (input.end !== undefined) body.endTime = input.end;
  if (input.title !== undefined) body.title = input.title;
  if (input.purpose !== undefined) body.purpose = input.purpose;
  if (input.participants !== undefined) body.participants = input.participants;
  const updated = await api.patch<BackendReservation>(`/api/reservations/${id}`, body);
  return toFrontendReservation(updated);
}

export async function cancelReservation(id: string) {
  const r = await api.post<BackendReservation>(`/api/reservations/${id}/cancel`);
  return toFrontendReservation(r);
}

export async function approveReservation(id: string) {
  const r = await api.post<BackendReservation>(`/api/reservations/${id}/approve`);
  return toFrontendReservation(r);
}

export async function rejectReservation(id: string, reason?: string) {
  const r = await api.post<BackendReservation>(`/api/reservations/${id}/reject`, {
    reason,
  });
  return toFrontendReservation(r);
}
