// Handlers MSW : simulent l'API REST avec latence, erreurs et état mutable.

import { http, HttpResponse, delay } from 'msw';
import type {
  Announcement,
  AuditLog,
  AvailabilityResponse,
  ChatResponse,
  Loan,
  Paginated,
  Reservation,
  Resource,
  ResourceFilters,
  User,
} from '@plateforme/shared';
import {
  db,
  addAudit,
  addNotification,
  findUserByEmail,
  nid,
  checkPassword,
  setPassword,
  resourceName,
  userName,
} from './db';
import { emitMockSocketEvent } from '@/lib/socket';

const API = '/api';
const LATENCY = 180;

// ---------- Auth helpers ----------

function bearerUser(request: Request): User | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  // Format mock : "mock-<userId>-<exp>"
  const parts = token.split('-');
  if (parts[0] !== 'mock' || !parts[1]) return null;
  const user = db.users.find((u) => u.id === parts[1]);
  if (!user) return null;
  const exp = Number(parts[2] ?? 0);
  if (exp && exp < Date.now()) return null; // token expiré → 401
  return user;
}

function requireAuth(request: Request): User | Response {
  const user = bearerUser(request);
  if (!user) return HttpResponse.json({ message: 'Non authentifié' }, { status: 401 });
  return user;
}

function requireRole(user: User, roles: User['role'][]): Response | null {
  if (!roles.includes(user.role)) {
    return HttpResponse.json({ message: 'Accès refusé : droits insuffisants' }, { status: 403 });
  }
  return null;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

// ---------- Availability ----------

function buildAvailability(resource: Resource, from: string, to: string): AvailabilityResponse {
  const loc = db.locations.find((l) => l.id === resource.locationId);
  const hours = loc?.openingHours ?? [
    { day: 1, open: '08:00', close: '20:00' },
    { day: 2, open: '08:00', close: '20:00' },
    { day: 3, open: '08:00', close: '20:00' },
    { day: 4, open: '08:00', close: '20:00' },
    { day: 5, open: '08:00', close: '20:00' },
    { day: 6, open: '09:00', close: '18:00' },
    { day: 0, open: '09:00', close: '18:00' },
  ];

  const start = new Date(from);
  const end = new Date(to);
  const slots: AvailabilityResponse['slots'] = [];

  const busy = db.reservations.filter(
    (r) =>
      r.resourceId === resource.id &&
      (r.status === 'approved' || r.status === 'pending') &&
      overlaps(
        new Date(r.start).getTime(),
        new Date(r.end).getTime(),
        start.getTime(),
        end.getTime(),
      ),
  );

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    const oh = hours.find((h) => h.day === day);
    if (!oh) {
      slots.push({
        start: new Date(d).toISOString(),
        end: new Date(new Date(d).setHours(23, 59)).toISOString(),
        status: 'closed',
        reason: 'Fermé ce jour',
      });
      continue;
    }
    const [ohH, ohM] = oh.open.split(':').map(Number);
    const [chH, chM] = oh.close.split(':').map(Number);
    const openT = new Date(d);
    openT.setHours(ohH ?? 0, ohM ?? 0, 0, 0);
    const closeT = new Date(d);
    closeT.setHours(chH ?? 0, chM ?? 0, 0, 0);

    // Segment « fermé » avant ouverture
    slots.push({
      start: new Date(d).toISOString(),
      end: openT.toISOString(),
      status: 'closed',
      reason: 'Hors horaires d’ouverture',
    });
    // Créneaux horaires dans les horaires d'ouverture
    for (let h = openT.getTime(); h < closeT.getTime(); h += 3600_000) {
      const s = new Date(h);
      const e = new Date(Math.min(h + 3600_000, closeT.getTime()));
      const isBusy = busy.some((r) =>
        overlaps(new Date(r.start).getTime(), new Date(r.end).getTime(), s.getTime(), e.getTime()),
      );
      slots.push({
        start: s.toISOString(),
        end: e.toISOString(),
        status: isBusy ? 'busy' : 'free',
        ...(isBusy ? { reason: 'Réservation existante' } : {}),
      });
    }
    slots.push({
      start: closeT.toISOString(),
      end: new Date(new Date(d).setHours(23, 59)).toISOString(),
      status: 'closed',
      reason: 'Hors horaires d’ouverture',
    });
  }
  return { resourceId: resource.id, from, to, slots };
}

// ---------- Chatbot (mock simple par mots-clés) ----------

function chatbotReply(message: string): ChatResponse {
  const m = message.toLowerCase();
  const rooms = db.resources.filter((r) => r.type === 'room' && r.isActive);
  const equipment = db.resources.filter((r) => r.type === 'equipment' && r.isActive);

  const toCard = (r: Resource) => ({
    resourceId: r.id,
    name: r.name,
    type: r.type,
    locationName: r.locationName,
    capacity: r.room?.capacity,
    inventoryNumber: r.equipment?.inventoryNumber,
    excerpt: r.description.slice(0, 120),
  });

  // Détection d'une demande de réservation
  if (/réserv|book|creneau|créneau/.test(m)) {
    const target = [...rooms, ...equipment].find((r) =>
      m.includes(r.name.toLowerCase().split(' ')[0] ?? ''),
    );
    if (target) {
      const start = new Date(Date.now() + 86400_000);
      start.setHours(10, 0, 0, 0);
      const end = new Date(start.getTime() + 2 * 3600_000);
      const payload = {
        resourceId: target.id,
        title: `Réservation ${target.name}`,
        purpose: message.slice(0, 200),
        start: start.toISOString(),
        end: end.toISOString(),
        participants: 2,
      };
      return {
        message: {
          id: nid('chat'),
          role: 'assistant',
          content: `Je peux vous proposer une réservation pour **${target.name}** demain de 10h à 12h. Confirmez-vous cette demande ?`,
          createdAt: new Date().toISOString(),
          slotSuggestions: [
            {
              resourceId: target.id,
              resourceName: target.name,
              start: payload.start,
              end: payload.end,
            },
          ],
          actionProposal: {
            kind: 'create_reservation',
            label: 'Réserver ce créneau',
            payload,
            summary: `${target.name} — ${new Date(payload.start).toLocaleString('fr-FR')} → ${new Date(payload.end).toLocaleTimeString('fr-FR')}`,
          },
        },
      };
    }
    return {
      message: {
        id: nid('chat'),
        role: 'assistant',
        content: 'Précisez la ressource souhaitée. Voici les salles disponibles :',
        createdAt: new Date().toISOString(),
        resourceCards: rooms.slice(0, 3).map(toCard),
      },
    };
  }

  if (/salle|réunion|meeting|atelier|studio/.test(m)) {
    return {
      message: {
        id: nid('chat'),
        role: 'assistant',
        content: 'Voici les salles disponibles :',
        createdAt: new Date().toISOString(),
        resourceCards: rooms.map(toCard),
      },
    };
  }

  if (/matériel|equipement|équipement|imprimante|laser|caméra|cnc/.test(m)) {
    return {
      message: {
        id: nid('chat'),
        role: 'assistant',
        content: 'Voici le matériel disponible :',
        createdAt: new Date().toISOString(),
        resourceCards: equipment.map(toCard),
      },
    };
  }

  if (/disponib|libre|quand|horaire/.test(m)) {
    return {
      message: {
        id: nid('chat'),
        role: 'assistant',
        content:
          'La plupart des espaces sont ouverts de 8h à 20h en semaine. Sélectionnez une ressource pour voir ses créneaux précis.',
        createdAt: new Date().toISOString(),
        resourceCards: rooms.slice(0, 2).map(toCard),
      },
    };
  }

  return {
    message: {
      id: nid('chat'),
      role: 'assistant',
      content:
        'Bonjour ! Je peux vous aider à trouver une salle ou du matériel. Essayez : « une salle de réunion », « imprimante 3D » ou « réserver la salle Agora ».',
      createdAt: new Date().toISOString(),
    },
  };
}

// ---------- Handlers ----------

export const handlers = [
  // Health
  http.get(`${API}/health`, async () => {
    await delay(LATENCY / 4);
    return HttpResponse.json({ status: 'ok', uptime: 12345, version: 'mock-1.0.0' });
  }),

  // Auth
  http.post(`${API}/auth/login`, async ({ request }) => {
    await delay(LATENCY);
    const body = (await request.json()) as { email?: string; password?: string };
    const user = findUserByEmail(body.email ?? '');
    if (!user || !checkPassword(user.email, body.password ?? '')) {
      return HttpResponse.json({ message: 'Identifiants invalides' }, { status: 401 });
    }
    const exp = Date.now() + 8 * 3600_000;
    return HttpResponse.json({
      user,
      tokens: { accessToken: `mock-${user.id}-${exp}`, expiresAt: new Date(exp).toISOString() },
    });
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    await delay(LATENCY);
    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
    };
    const email = (body.email ?? '').trim().toLowerCase();
    if (!email || !body.password) {
      return HttpResponse.json(
        { message: 'E-mail et mot de passe sont obligatoires' },
        { status: 422 },
      );
    }
    if (findUserByEmail(email)) {
      return HttpResponse.json(
        { message: 'Un compte existe déjà avec cet e-mail' },
        { status: 409 },
      );
    }
    const user: User = {
      id: nid('u'),
      email,
      firstName: body.firstName?.trim() || email.split('@')[0] || 'Utilisateur',
      lastName: body.lastName?.trim() || '',
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    setPassword(email, body.password);
    addAudit({
      userId: user.id,
      userName: userName(user.id),
      action: 'user.register',
      entityType: 'user',
      entityId: user.id,
    });
    const exp = Date.now() + 8 * 3600_000;
    return HttpResponse.json(
      {
        user,
        tokens: { accessToken: `mock-${user.id}-${exp}`, expiresAt: new Date(exp).toISOString() },
      },
      { status: 201 },
    );
  }),

  http.post(`${API}/auth/logout`, async () => {
    await delay(50);
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${API}/me`, async ({ request }) => {
    await delay(LATENCY / 2);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    return HttpResponse.json(user);
  }),

  // Locations
  http.get(`${API}/locations`, async ({ request }) => {
    await delay(LATENCY / 2);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    return HttpResponse.json({ items: db.locations });
  }),

  // Resources
  http.get(`${API}/resources`, async ({ request }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const filters: ResourceFilters = {
      type: (url.searchParams.get('type') as ResourceFilters['type']) ?? undefined,
      locationId: url.searchParams.get('locationId') ?? undefined,
      minCapacity: url.searchParams.get('minCapacity')
        ? Number(url.searchParams.get('minCapacity'))
        : undefined,
      state: (url.searchParams.get('state') as ResourceFilters['state']) ?? undefined,
      q: url.searchParams.get('q') ?? undefined,
      page: Number(url.searchParams.get('page') ?? 1),
      pageSize: Number(url.searchParams.get('pageSize') ?? 12),
      sort: (url.searchParams.get('sort') as ResourceFilters['sort']) ?? undefined,
      order: (url.searchParams.get('order') as 'asc' | 'desc') ?? undefined,
    };

    let items = db.resources.filter((r) => r.isActive);
    if (filters.type) items = items.filter((r) => r.type === filters.type);
    if (filters.locationId) items = items.filter((r) => r.locationId === filters.locationId);
    if (filters.state) items = items.filter((r) => r.equipment?.state === filters.state);
    if (filters.minCapacity)
      items = items.filter((r) => (r.room?.capacity ?? 0) >= (filters.minCapacity ?? 0));
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.equipment?.inventoryNumber.toLowerCase().includes(q),
      );
    }
    if (filters.sort) {
      const dir = filters.order === 'desc' ? -1 : 1;
      items = [...items].sort((a, b) => {
        if (filters.sort === 'name') return a.name.localeCompare(b.name) * dir;
        if (filters.sort === 'capacity')
          return ((a.room?.capacity ?? 0) - (b.room?.capacity ?? 0)) * dir;
        return a.createdAt.localeCompare(b.createdAt) * dir;
      });
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 12;
    const paginated: Paginated<Resource> = {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
    };
    return HttpResponse.json(paginated);
  }),

  http.get(`${API}/resources/:id`, async ({ request, params }) => {
    await delay(LATENCY / 2);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const r = db.resources.find((x) => x.id === params.id);
    if (!r) return HttpResponse.json({ message: 'Ressource introuvable' }, { status: 404 });
    return HttpResponse.json(r);
  }),

  http.get(`${API}/resources/:id/availability`, async ({ request, params }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const r = db.resources.find((x) => x.id === params.id);
    if (!r) return HttpResponse.json({ message: 'Ressource introuvable' }, { status: 404 });
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? new Date().toISOString();
    const to = url.searchParams.get('to') ?? new Date(Date.now() + 7 * 86400_000).toISOString();
    return HttpResponse.json(buildAvailability(r, from, to));
  }),

  // ---------- Ressources : écriture (manager/admin) ----------

  http.post(`${API}/resources`, async ({ request }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const forbidden = requireRole(user, ['manager', 'admin']);
    if (forbidden) return forbidden;
    const body = (await request.json()) as Partial<Resource>;
    if (!body.name || !body.type || !body.locationId) {
      return HttpResponse.json({ message: 'Nom, type et lieu sont obligatoires' }, { status: 422 });
    }
    if (body.type === 'room' && !body.room?.capacity) {
      return HttpResponse.json(
        { message: 'La capacité est obligatoire pour une salle' },
        { status: 422 },
      );
    }
    if (body.type === 'equipment' && !body.equipment?.inventoryNumber) {
      return HttpResponse.json(
        { message: "Le numéro d'inventaire est obligatoire" },
        { status: 422 },
      );
    }
    const resource: Resource = {
      id: nid('res'),
      type: body.type,
      name: body.name,
      description: body.description ?? '',
      locationId: body.locationId,
      locationName: db.locations.find((l) => l.id === body.locationId)?.name,
      photos: body.photos ?? [],
      tags: body.tags ?? [],
      room: body.room,
      equipment: body.equipment,
      rules: body.rules ?? {},
      isActive: body.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.resources.unshift(resource);
    addAudit({
      userId: user.id,
      userName: userName(user.id),
      action: 'resource.create',
      entityType: 'resource',
      entityId: resource.id,
    });
    return HttpResponse.json(resource, { status: 201 });
  }),

  http.patch(`${API}/resources/:id`, async ({ request, params }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const forbidden = requireRole(user, ['manager', 'admin']);
    if (forbidden) return forbidden;
    const r = db.resources.find((x) => x.id === params.id);
    if (!r) return HttpResponse.json({ message: 'Ressource introuvable' }, { status: 404 });
    const body = (await request.json()) as Partial<Resource>;
    Object.assign(r, body, { id: r.id, updatedAt: new Date().toISOString() });
    if (body.locationId) r.locationName = db.locations.find((l) => l.id === body.locationId)?.name;
    addAudit({
      userId: user.id,
      userName: userName(user.id),
      action: 'resource.update',
      entityType: 'resource',
      entityId: r.id,
    });
    return HttpResponse.json(r);
  }),

  // ---------- Réservations ----------

  http.get(`${API}/reservations`, async ({ request }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const resourceId = url.searchParams.get('resourceId');
    const status = url.searchParams.get('status');
    const mine = url.searchParams.get('mine') === 'true';
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    let items = db.reservations;
    if (mine || user.role === 'user') items = items.filter((r) => r.userId === user.id);
    if (resourceId) items = items.filter((r) => r.resourceId === resourceId);
    if (status) items = items.filter((r) => r.status === status);
    if (from) items = items.filter((r) => new Date(r.end).getTime() > new Date(from).getTime());
    if (to) items = items.filter((r) => new Date(r.start).getTime() < new Date(to).getTime());
    items = items.map((r) => ({
      ...r,
      resourceName: r.resourceName ?? resourceName(r.resourceId),
      userName: r.userName ?? userName(r.userId),
    }));
    return HttpResponse.json({ items: items.sort((a, b) => a.start.localeCompare(b.start)) });
  }),

  http.post(`${API}/reservations`, async ({ request }) => {
    await delay(LATENCY + 120);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const body = (await request.json()) as Partial<Reservation>;
    if (!body.resourceId || !body.start || !body.end || !body.title) {
      return HttpResponse.json({ message: 'Champs obligatoires manquants' }, { status: 422 });
    }
    const resource = db.resources.find((r) => r.id === body.resourceId);
    if (!resource) return HttpResponse.json({ message: 'Ressource introuvable' }, { status: 404 });

    const start = new Date(body.start).getTime();
    const end = new Date(body.end).getTime();
    if (end <= start) {
      return HttpResponse.json(
        { message: 'La fin doit être postérieure au début' },
        { status: 422 },
      );
    }
    if (resource.room && body.participants && body.participants > resource.room.capacity) {
      return HttpResponse.json(
        { message: `Capacité dépassée : ${resource.room.capacity} places maximum` },
        { status: 422 },
      );
    }
    const minNotice = (resource.rules.minNoticeHours ?? 0) * 3600_000;
    if (start - Date.now() < minNotice) {
      return HttpResponse.json(
        { message: `Préavis minimum de ${resource.rules.minNoticeHours} h requis` },
        { status: 422 },
      );
    }

    // Conflit → 409
    const conflict = db.reservations.find(
      (r) =>
        r.resourceId === resource.id &&
        (r.status === 'approved' || r.status === 'pending') &&
        overlaps(start, end, new Date(r.start).getTime(), new Date(r.end).getTime()),
    );
    if (conflict) {
      return HttpResponse.json(
        {
          message: 'Créneau déjà pris',
          conflictWith: { id: conflict.id, start: conflict.start, end: conflict.end },
        },
        { status: 409 },
      );
    }

    const reservation: Reservation = {
      id: nid('resv'),
      resourceId: resource.id,
      resourceName: resource.name,
      userId: user.id,
      userName: userName(user.id),
      title: body.title,
      purpose: body.purpose ?? '',
      start: new Date(body.start).toISOString(),
      end: new Date(body.end).toISOString(),
      participants: body.participants ?? 1,
      status: resource.rules.requiresApproval ? 'pending' : 'approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.reservations.unshift(reservation);
    addAudit({
      userId: user.id,
      userName: userName(user.id),
      action: 'reservation.create',
      entityType: 'reservation',
      entityId: reservation.id,
    });
    emitMockSocketEvent('reservation.created', { reservation });
    // Notifie les managers
    db.users
      .filter((u) => u.role === 'manager' || u.role === 'admin')
      .forEach((m) =>
        addNotification({
          userId: m.id,
          type: 'reservation_created',
          title: 'Nouvelle demande de réservation',
          body: `${userName(user.id)} a réservé « ${resource.name} » le ${new Date(reservation.start).toLocaleString('fr-FR')}.`,
          link: '/reservations',
        }),
      );
    return HttpResponse.json(reservation, { status: 201 });
  }),

  http.get(`${API}/reservations/:id`, async ({ request, params }) => {
    await delay(LATENCY / 2);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const r = db.reservations.find((x) => x.id === params.id);
    if (!r) return HttpResponse.json({ message: 'Réservation introuvable' }, { status: 404 });
    if (user.role === 'user' && r.userId !== user.id) {
      return HttpResponse.json({ message: 'Accès refusé' }, { status: 403 });
    }
    return HttpResponse.json({
      ...r,
      resourceName: resourceName(r.resourceId),
      userName: userName(r.userId),
    });
  }),

  http.patch(`${API}/reservations/:id`, async ({ request, params }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const r = db.reservations.find((x) => x.id === params.id);
    if (!r) return HttpResponse.json({ message: 'Réservation introuvable' }, { status: 404 });
    if (user.role === 'user' && r.userId !== user.id) {
      return HttpResponse.json({ message: 'Accès refusé' }, { status: 403 });
    }
    if (r.status === 'cancelled' || r.status === 'rejected') {
      return HttpResponse.json(
        { message: 'Cette réservation ne peut plus être modifiée' },
        { status: 409 },
      );
    }
    const body = (await request.json()) as Partial<Reservation>;
    const next = { ...r, ...body, id: r.id, updatedAt: new Date().toISOString() };
    const start = new Date(next.start).getTime();
    const end = new Date(next.end).getTime();
    const conflict = db.reservations.find(
      (x) =>
        x.id !== r.id &&
        x.resourceId === r.resourceId &&
        (x.status === 'approved' || x.status === 'pending') &&
        overlaps(start, end, new Date(x.start).getTime(), new Date(x.end).getTime()),
    );
    if (conflict) {
      return HttpResponse.json(
        { message: 'Créneau déjà pris', conflictWith: { id: conflict.id } },
        { status: 409 },
      );
    }
    Object.assign(r, next);
    emitMockSocketEvent('reservation.updated', { reservation: r });
    addAudit({
      userId: user.id,
      userName: userName(user.id),
      action: 'reservation.update',
      entityType: 'reservation',
      entityId: r.id,
    });
    return HttpResponse.json(r);
  }),

  http.post(`${API}/reservations/:id/cancel`, async ({ request, params }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const r = db.reservations.find((x) => x.id === params.id);
    if (!r) return HttpResponse.json({ message: 'Réservation introuvable' }, { status: 404 });
    if (user.role === 'user' && r.userId !== user.id) {
      return HttpResponse.json({ message: 'Accès refusé' }, { status: 403 });
    }
    if (r.status === 'cancelled') {
      return HttpResponse.json({ message: 'Déjà annulée' }, { status: 409 });
    }
    r.status = 'cancelled';
    r.updatedAt = new Date().toISOString();
    emitMockSocketEvent('reservation.cancelled', { reservation: r });
    addAudit({
      userId: user.id,
      userName: userName(user.id),
      action: 'reservation.cancel',
      entityType: 'reservation',
      entityId: r.id,
    });
    return HttpResponse.json(r);
  }),

  // Validation / refus (manager/admin) — via PATCH status
  http.post(`${API}/reservations/:id/approve`, async ({ request, params }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const forbidden = requireRole(user, ['manager', 'admin']);
    if (forbidden) return forbidden;
    const r = db.reservations.find((x) => x.id === params.id);
    if (!r) return HttpResponse.json({ message: 'Réservation introuvable' }, { status: 404 });
    r.status = 'approved';
    r.updatedAt = new Date().toISOString();
    emitMockSocketEvent('reservation.updated', { reservation: r });
    addNotification({
      userId: r.userId,
      type: 'reservation_approved',
      title: 'Réservation approuvée',
      body: `Votre réservation « ${r.title} » a été approuvée.`,
      link: '/reservations',
    });
    return HttpResponse.json(r);
  }),

  http.post(`${API}/reservations/:id/reject`, async ({ request, params }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const forbidden = requireRole(user, ['manager', 'admin']);
    if (forbidden) return forbidden;
    const r = db.reservations.find((x) => x.id === params.id);
    if (!r) return HttpResponse.json({ message: 'Réservation introuvable' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    r.status = 'rejected';
    r.rejectionReason = body.reason;
    r.updatedAt = new Date().toISOString();
    emitMockSocketEvent('reservation.updated', { reservation: r });
    addNotification({
      userId: r.userId,
      type: 'reservation_rejected',
      title: 'Réservation refusée',
      body: `Votre réservation « ${r.title} » a été refusée${body.reason ? ` : ${body.reason}` : '.'}`,
      link: '/reservations',
    });
    return HttpResponse.json(r);
  }),

  // ---------- Prêts ----------

  http.get(`${API}/loans`, async ({ request }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const resourceId = url.searchParams.get('resourceId');
    const status = url.searchParams.get('status');
    const mine = url.searchParams.get('mine') === 'true';
    let items = db.loans;
    if (mine || user.role === 'user') items = items.filter((l) => l.userId === user.id);
    if (resourceId) items = items.filter((l) => l.resourceId === resourceId);
    if (status) items = items.filter((l) => l.status === status);
    items = items.map((l) => ({
      ...l,
      resourceName: l.resourceName ?? resourceName(l.resourceId),
      userName: l.userName ?? userName(l.userId),
    }));
    return HttpResponse.json({ items });
  }),

  http.post(`${API}/loans`, async ({ request }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const body = (await request.json()) as Partial<Loan>;
    if (!body.resourceId || !body.plannedStart || !body.plannedEnd) {
      return HttpResponse.json({ message: 'Champs obligatoires manquants' }, { status: 422 });
    }
    const resource = db.resources.find((r) => r.id === body.resourceId && r.type === 'equipment');
    if (!resource) return HttpResponse.json({ message: 'Équipement introuvable' }, { status: 404 });
    if (resource.equipment?.state !== 'available') {
      return HttpResponse.json({ message: 'Cet équipement n’est pas disponible' }, { status: 409 });
    }
    const active = db.loans.find(
      (l) =>
        l.resourceId === resource.id &&
        (l.status === 'active' || l.status === 'requested' || l.status === 'overdue'),
    );
    if (active) {
      return HttpResponse.json(
        { message: 'Cet équipement est déjà prêté ou réservé' },
        { status: 409 },
      );
    }
    const loan: Loan = {
      id: nid('loan'),
      resourceId: resource.id,
      resourceName: resource.name,
      userId: user.id,
      userName: userName(user.id),
      plannedStart: body.plannedStart,
      plannedEnd: body.plannedEnd,
      status: 'requested',
      notes: body.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.loans.unshift(loan);
    emitMockSocketEvent('loan.updated', { loan });
    return HttpResponse.json(loan, { status: 201 });
  }),

  http.post(`${API}/loans/:id/return`, async ({ request, params }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const forbidden = requireRole(user, ['manager', 'admin']);
    if (forbidden) return forbidden;
    const loan = db.loans.find((l) => l.id === params.id);
    if (!loan) return HttpResponse.json({ message: 'Prêt introuvable' }, { status: 404 });
    if (loan.status === 'returned') {
      return HttpResponse.json({ message: 'Déjà retourné' }, { status: 409 });
    }
    const body = (await request.json()) as { conditionIn?: string; notes?: string };
    if (!body.conditionIn) {
      return HttpResponse.json(
        { message: 'La condition de retour est obligatoire' },
        { status: 422 },
      );
    }
    loan.status = 'returned';
    loan.actualEnd = new Date().toISOString();
    loan.conditionIn = body.conditionIn;
    loan.notes = body.notes ?? loan.notes;
    loan.updatedAt = new Date().toISOString();
    const res = db.resources.find((r) => r.id === loan.resourceId);
    if (res?.equipment) res.equipment.state = 'available';
    emitMockSocketEvent('loan.updated', { loan });
    addNotification({
      userId: loan.userId,
      type: 'loan_updated',
      title: 'Matériel retourné',
      body: `Votre prêt « ${loan.resourceName ?? resourceName(loan.resourceId)} » a été enregistré comme retourné.`,
      link: '/prets',
    });
    addAudit({
      userId: user.id,
      userName: userName(user.id),
      action: 'loan.return',
      entityType: 'loan',
      entityId: loan.id,
    });
    return HttpResponse.json(loan);
  }),

  http.post(`${API}/loans/:id/checkout`, async ({ request, params }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const forbidden = requireRole(user, ['manager', 'admin']);
    if (forbidden) return forbidden;
    const loan = db.loans.find((l) => l.id === params.id);
    if (!loan) return HttpResponse.json({ message: 'Prêt introuvable' }, { status: 404 });
    if (loan.status !== 'requested') {
      return HttpResponse.json({ message: 'Seule une demande peut être remise' }, { status: 409 });
    }
    loan.status = 'active';
    loan.conditionOut = 'Bon état';
    loan.updatedAt = new Date().toISOString();
    emitMockSocketEvent('loan.updated', { loan });
    return HttpResponse.json(loan);
  }),

  // ---------- Notifications ----------

  http.get(`${API}/notifications`, async ({ request }) => {
    await delay(LATENCY / 2);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';
    let items = db.notifications.filter((n) => n.userId === user.id);
    if (unreadOnly) items = items.filter((n) => !n.read);
    return HttpResponse.json({
      items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    });
  }),

  http.post(`${API}/notifications/:id/read`, async ({ request, params }) => {
    await delay(30);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const n = db.notifications.find((x) => x.id === params.id && x.userId === user.id);
    if (n) n.read = true;
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${API}/notifications/read-all`, async ({ request }) => {
    await delay(30);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    db.notifications.filter((n) => n.userId === user.id).forEach((n) => (n.read = true));
    return HttpResponse.json({ ok: true });
  }),

  // ---------- Annonces / collaboration ----------

  http.get(`${API}/resources/:id/announcements`, async ({ request, params }) => {
    await delay(LATENCY / 2);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const anns = db.announcements.filter((a) => a.resourceId === params.id);
    const replies = db.discussionReplies.filter((r) => anns.some((a) => a.id === r.announcementId));
    return HttpResponse.json({
      announcements: anns.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      replies,
    });
  }),

  http.post(`${API}/resources/:id/announcements`, async ({ request, params }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const body = (await request.json()) as { title?: string; body?: string };
    if (!body.title || !body.body) {
      return HttpResponse.json({ message: 'Titre et message obligatoires' }, { status: 422 });
    }
    const isOfficial = user.role === 'manager' || user.role === 'admin';
    const ann: Announcement = {
      id: nid('ann'),
      resourceId: String(params.id),
      authorId: user.id,
      authorName: userName(user.id),
      authorRole: user.role,
      isOfficial: isOfficial && body.title.startsWith('[Officiel]') ? true : isOfficial,
      title: body.title,
      body: body.body,
      createdAt: new Date().toISOString(),
    };
    db.announcements.unshift(ann);
    return HttpResponse.json(ann, { status: 201 });
  }),

  http.post(`${API}/announcements/:id/replies`, async ({ request, params }) => {
    await delay(LATENCY / 2);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const body = (await request.json()) as { body?: string };
    if (!body.body) return HttpResponse.json({ message: 'Message vide' }, { status: 422 });
    const reply = {
      id: nid('rep'),
      announcementId: String(params.id),
      authorId: user.id,
      authorName: userName(user.id),
      body: body.body,
      createdAt: new Date().toISOString(),
    };
    db.discussionReplies.push(reply);
    return HttpResponse.json(reply, { status: 201 });
  }),

  // ---------- Chatbot ----------

  http.post(`${API}/chatbot/message`, async ({ request }) => {
    await delay(LATENCY + 250);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const body = (await request.json()) as {
      message?: string;
      history?: { role: string; content: string }[];
    };
    if (!body.message?.trim()) {
      return HttpResponse.json({ message: 'Message vide' }, { status: 422 });
    }
    return HttpResponse.json(chatbotReply(body.message));
  }),

  // ---------- Admin : utilisateurs, audit, stats ----------

  http.get(`${API}/users`, async ({ request }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const forbidden = requireRole(user, ['admin']);
    if (forbidden) return forbidden;
    return HttpResponse.json({ items: db.users });
  }),

  http.patch(`${API}/users/:id`, async ({ request, params }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const forbidden = requireRole(user, ['admin']);
    if (forbidden) return forbidden;
    const target = db.users.find((u) => u.id === params.id);
    if (!target) return HttpResponse.json({ message: 'Utilisateur introuvable' }, { status: 404 });
    const body = (await request.json()) as { role?: string; firstName?: string; lastName?: string };
    if (body.role && !['user', 'manager', 'admin'].includes(body.role)) {
      return HttpResponse.json({ message: 'Rôle invalide' }, { status: 422 });
    }
    Object.assign(target, body);
    addAudit({
      userId: user.id,
      userName: userName(user.id),
      action: 'user.update',
      entityType: 'user',
      entityId: target.id,
      metadata: body,
    });
    return HttpResponse.json(target);
  }),

  http.get(`${API}/audit-logs`, async ({ request }) => {
    await delay(LATENCY);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const forbidden = requireRole(user, ['admin']);
    if (forbidden) return forbidden;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
    let items = db.auditLogs;
    if (action) items = items.filter((a) => a.action.includes(action));
    if (userId) items = items.filter((a) => a.userId === userId);
    if (from) items = items.filter((a) => a.createdAt >= from);
    if (to) items = items.filter((a) => a.createdAt <= to);
    const paginated: Paginated<AuditLog> = {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
    };
    return HttpResponse.json(paginated);
  }),

  http.get(`${API}/stats/overview`, async ({ request }) => {
    await delay(LATENCY / 2);
    const user = requireAuth(request);
    if (user instanceof Response) return user;
    const nowT = Date.now();
    const weekAhead = nowT + 7 * 86400_000;
    const upcoming = db.reservations.filter(
      (r) =>
        r.status !== 'cancelled' &&
        r.status !== 'rejected' &&
        new Date(r.start).getTime() < weekAhead &&
        new Date(r.end).getTime() > nowT,
    );
    const overdueLoans = db.loans.filter(
      (l) =>
        l.status === 'overdue' ||
        (l.status === 'active' && new Date(l.plannedEnd).getTime() < nowT),
    );
    return HttpResponse.json({
      reservationsThisWeek: upcoming.length,
      pendingReservations: db.reservations.filter((r) => r.status === 'pending').length,
      activeLoans: db.loans.filter((l) => l.status === 'active').length,
      overdueLoans: overdueLoans.length,
      totalResources: db.resources.filter((r) => r.isActive).length,
      totalUsers: db.users.length,
      reservationsByDay: Array.from({ length: 7 }, (_, i) => {
        const dayStart = new Date(nowT + i * 86400_000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = dayStart.getTime() + 86400_000;
        return {
          date: dayStart.toISOString().slice(0, 10),
          count: db.reservations.filter(
            (r) =>
              r.status !== 'cancelled' &&
              r.status !== 'rejected' &&
              new Date(r.start).getTime() < dayEnd &&
              new Date(r.end).getTime() > dayStart.getTime(),
          ).length,
        };
      }),
    });
  }),
];
