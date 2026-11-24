import { api } from '@/lib/api';
import { toBackendRole, toFrontendUser } from '@/lib/backend';
import type { BackendUser } from '@/lib/backend';
import type { AuditLog, Paginated, User, UserRole } from '@plateforme/shared';

export async function fetchUsers() {
  const res = await api.get<{ items: BackendUser[] }>('/api/users', {
    page: 1,
    limit: 100,
  });
  return { items: res.items.map(toFrontendUser) };
}

export function updateUser(
  id: string,
  input: { role?: UserRole; firstName?: string; lastName?: string },
) {
  const body: Record<string, unknown> = {};
  if (input.role !== undefined) body.role = toBackendRole(input.role);
  if (input.firstName !== undefined) body.firstName = input.firstName;
  if (input.lastName !== undefined) body.lastName = input.lastName;
  return api.patch<BackendUser>(`/api/users/${id}`, body).then((u) => toFrontendUser(u));
}

interface BackendAuditLog {
  _id?: string;
  id?: string;
  userId?: unknown;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  createdAt?: string;
}

export async function fetchAuditLogs(params: {
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<AuditLog>> {
  // Noms d'utilisateurs pour affichage
  const users = await fetchUsers().catch(() => ({ items: [] as User[] }));
  const names = new Map(users.items.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

  const res = await api.get<{
    items: BackendAuditLog[];
    total: number;
    page: number;
    limit: number;
  }>('/api/audit-logs', {
    action: params.action,
    userId: params.userId,
    from: params.from,
    to: params.to,
    page: params.page ?? 1,
    limit: params.pageSize ?? 20,
  });

  const popId = (v: unknown): string => {
    if (v && typeof v === 'object') {
      const o = v as { _id?: unknown; id?: unknown; toString?: () => string };
      return String(o._id ?? o.id ?? o.toString?.() ?? '');
    }
    return String(v ?? '');
  };

  return {
    items: res.items.map((l) => {
      const userId = popId(l.userId);
      return {
        id: String(l._id ?? l.id),
        userId,
        userName: names.get(userId),
        action: l.action,
        entityType: l.resourceType ?? 'inconnu',
        entityId: l.resourceId ?? '',
        metadata: l.details,
        createdAt: l.createdAt ?? new Date().toISOString(),
      };
    }),
    total: res.total,
    page: res.page,
    pageSize: res.limit,
  };
}
