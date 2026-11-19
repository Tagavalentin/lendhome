import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUpdateUser, useUsers } from '../hooks';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '@/components/ui/Feedback';
import { Table } from '@/components/ui/Table';
import { Select } from '@/components/ui/Input';
import { formatDate, USER_ROLE_LABELS } from '@/lib/utils';
import type { UserRole } from '@plateforme/shared';

export function AdminUsersPage() {
  const me = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useUsers();
  const updateUser = useUpdateUser();
  const [filter, setFilter] = useState('');

  if (isLoading) return <Spinner />;
  if (isError)
    return (
      <ErrorState message="Impossible de charger les utilisateurs." onRetry={() => refetch()} />
    );

  const items = (data?.items ?? []).filter(
    (u) =>
      !filter ||
      u.role === filter ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
      u.email.includes(filter),
  );

  return (
    <div>
      <PageHeader title="Utilisateurs" description="Comptes et rôles de la plateforme." />
      <div className="mb-4 max-w-sm">
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filtrer les utilisateurs"
        >
          <option value="">Tous les utilisateurs</option>
          <option value="user">Rôle : Utilisateur</option>
          <option value="manager">Rôle : Responsable</option>
          <option value="admin">Rôle : Administrateur</option>
        </Select>
      </div>
      {items.length === 0 ? (
        <EmptyState title="Aucun utilisateur" />
      ) : (
        <Table head={['Nom', 'E-mail', 'Rôle', 'Membre depuis', 'Actions']}>
          {items.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 font-medium text-gray-900">
                {u.firstName} {u.lastName}
                {u.id === me?.id && (
                  <Badge tone="blue" className="ml-2">
                    Vous
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">{u.email}</td>
              <td className="px-4 py-3">
                <Badge
                  tone={u.role === 'admin' ? 'purple' : u.role === 'manager' ? 'blue' : 'gray'}
                >
                  {USER_ROLE_LABELS[u.role]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-gray-600">{formatDate(u.createdAt)}</td>
              <td className="px-4 py-3">
                {u.id !== me?.id && (
                  <Select
                    value={u.role}
                    onChange={(e) =>
                      updateUser.mutate({ id: u.id, role: e.target.value as UserRole })
                    }
                    disabled={updateUser.isPending}
                    aria-label={`Rôle de ${u.firstName}`}
                    className="w-40"
                  >
                    <option value="user">Utilisateur</option>
                    <option value="manager">Responsable</option>
                    <option value="admin">Administrateur</option>
                  </Select>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
