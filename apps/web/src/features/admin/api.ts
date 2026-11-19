import { api } from '@/lib/api';
import type { AuditLog, Paginated, User, UserRole } from '@plateforme/shared';

export function fetchUsers() {
  return api.get<{ items: User[] }>('/api/users');
}

export function updateUser(
  id: string,
  input: { role?: UserRole; firstName?: string; lastName?: string },
) {
  return api.patch<User>(`/api/users/${id}`, input);
}

export function fetchAuditLogs(params: {
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  return api.get<Paginated<AuditLog>>('/api/audit-logs', params);
}
