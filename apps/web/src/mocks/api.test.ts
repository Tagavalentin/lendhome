// Tests d'intégration API via MSW (handlers mocks en mémoire).

import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { handlers } from './handlers';
import { api, setAccessToken } from '@/lib/api';
import type { LoginResponse, Paginated, Reservation, Resource, User } from '@plateforme/shared';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  setAccessToken(null);
});
afterAll(() => server.close());

async function loginAs(email: string) {
  const res = await api.post<LoginResponse>('/api/auth/login', {
    email,
    password: 'demo1234',
  });
  setAccessToken(res.tokens.accessToken);
  return res.user;
}

describe('Auth', () => {
  it('connecte un utilisateur avec des identifiants valides', async () => {
    const res = await api.post<LoginResponse>('/api/auth/login', {
      email: 'alice@demo.fr',
      password: 'demo1234',
    });
    expect(res.user.role).toBe('user');
    expect(res.tokens.accessToken).toContain('mock-u_alice');
  });

  it('rejette des identifiants invalides (401)', async () => {
    await expect(
      api.post('/api/auth/login', { email: 'alice@demo.fr', password: 'wrong-password' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('GET /api/me renvoie 401 sans token', async () => {
    await expect(api.get('/api/me')).rejects.toMatchObject({ status: 401 });
  });

  it('GET /api/me renvoie le profil avec token', async () => {
    await loginAs('claire@demo.fr');
    const me = await api.get<User>('/api/me');
    expect(me.email).toBe('claire@demo.fr');
    expect(me.role).toBe('manager');
  });
});

describe('Resources', () => {
  it('liste les ressources avec pagination', async () => {
    await loginAs('alice@demo.fr');
    const res = await api.get<Paginated<Resource>>('/api/resources', { page: 1, pageSize: 4 });
    expect(res.total).toBeGreaterThanOrEqual(6);
    expect(res.items.length).toBeLessThanOrEqual(4);
    expect(res.page).toBe(1);
  });

  it('filtre par type et recherche texte', async () => {
    await loginAs('alice@demo.fr');
    const res = await api.get<Paginated<Resource>>('/api/resources', {
      type: 'equipment',
      q: 'imprimante',
    });
    expect(res.items.every((r) => r.type === 'equipment')).toBe(true);
    expect(res.items.some((r) => r.name.toLowerCase().includes('imprimante'))).toBe(true);
  });
});

describe('Réservations', () => {
  it('crée une réservation sur un créneau libre', async () => {
    await loginAs('alice@demo.fr');
    const start = new Date(Date.now() + 5 * 86400_000);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 3600_000);
    const res = await api.post<Reservation>('/api/reservations', {
      resourceId: 'res_salle_d',
      title: 'Test création',
      purpose: 'Test unitaire',
      start: start.toISOString(),
      end: end.toISOString(),
      participants: 2,
    });
    expect(res.id).toBeTruthy();
    expect(['approved', 'pending']).toContain(res.status);
  });

  it('retourne 409 sur conflit de créneau', async () => {
    await loginAs('alice@demo.fr');
    const start = new Date(Date.now() + 6 * 86400_000);
    start.setHours(15, 0, 0, 0);
    const end = new Date(start.getTime() + 3600_000);

    await api.post('/api/reservations', {
      resourceId: 'res_salle_d',
      title: 'Premier',
      purpose: 'x',
      start: start.toISOString(),
      end: end.toISOString(),
      participants: 1,
    });
    await expect(
      api.post('/api/reservations', {
        resourceId: 'res_salle_d',
        title: 'Conflit',
        purpose: 'x',
        start: start.toISOString(),
        end: end.toISOString(),
        participants: 1,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('retourne 422 si participants > capacité', async () => {
    await loginAs('alice@demo.fr');
    const start = new Date(Date.now() + 7 * 86400_000);
    start.setHours(10, 0, 0, 0);
    await expect(
      api.post('/api/reservations', {
        resourceId: 'res_salle_c', // 6 places
        title: 'Trop de monde',
        purpose: 'x',
        start: start.toISOString(),
        end: new Date(start.getTime() + 3600_000).toISOString(),
        participants: 50,
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('annule une réservation', async () => {
    await loginAs('alice@demo.fr');
    const start = new Date(Date.now() + 8 * 86400_000);
    start.setHours(9, 0, 0, 0);
    const created = await api.post<Reservation>('/api/reservations', {
      resourceId: 'res_salle_d',
      title: 'À annuler',
      purpose: 'x',
      start: start.toISOString(),
      end: new Date(start.getTime() + 3600_000).toISOString(),
      participants: 1,
    });
    const cancelled = await api.post<Reservation>(`/api/reservations/${created.id}/cancel`);
    expect(cancelled.status).toBe('cancelled');
  });
});

describe('Droits', () => {
  it('un utilisateur ne peut pas approuver une réservation (403)', async () => {
    await loginAs('alice@demo.fr');
    await expect(api.post('/api/reservations/resv_seed2/approve')).rejects.toMatchObject({
      status: 403,
    });
  });

  it('un manager peut approuver une réservation', async () => {
    await loginAs('claire@demo.fr');
    const res = await api.post<Reservation>('/api/reservations/resv_seed2/approve');
    expect(res.status).toBe('approved');
  });

  it('seul un admin liste les utilisateurs', async () => {
    await loginAs('alice@demo.fr');
    await expect(api.get('/api/users')).rejects.toMatchObject({ status: 403 });
    setAccessToken(null);
    await loginAs('david@demo.fr');
    const users = await api.get<{ items: User[] }>('/api/users');
    expect(users.items.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Prêts', () => {
  it('cycle demande → retour', async () => {
    await loginAs('alice@demo.fr');
    const loan = await api.post<{ id: string; status: string }>('/api/loans', {
      resourceId: 'res_laser',
      plannedStart: '2026-12-01',
      plannedEnd: '2026-12-05',
    });
    expect(loan.status).toBe('requested');

    setAccessToken(null);
    await loginAs('claire@demo.fr');
    const returned = await api.post<{ status: string }>(`/api/loans/${loan.id}/return`, {
      conditionIn: 'Parfait état',
    });
    expect(returned.status).toBe('returned');
  });
});
