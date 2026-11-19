import { useState } from 'react';
import { useAuditLogs } from '../hooks';
import { useUsers } from '../hooks';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Spinner } from '@/components/ui/Feedback';
import { Table } from '@/components/ui/Table';
import { Field, Input, Select } from '@/components/ui/Input';
import { formatDateTime } from '@/lib/utils';

export function AuditLogPage() {
  const [filters, setFilters] = useState({ action: '', userId: '', page: 1 });
  const [draft, setDraft] = useState({ action: '', userId: '' });
  const { data, isLoading, isError, refetch } = useAuditLogs({
    action: filters.action || undefined,
    userId: filters.userId || undefined,
    page: filters.page,
    pageSize: 20,
  });
  const { data: users } = useUsers();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title="Journal d'audit"
        description="Historique des actions sensibles sur la plateforme."
      />

      <form
        className="mb-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ ...draft, page: 1 });
        }}
      >
        <Field label="Action" htmlFor="audit-action">
          <Input
            id="audit-action"
            placeholder="ex : reservation"
            value={draft.action}
            onChange={(e) => setDraft({ ...draft, action: e.target.value })}
          />
        </Field>
        <Field label="Utilisateur" htmlFor="audit-user">
          <Select
            id="audit-user"
            value={draft.userId}
            onChange={(e) => setDraft({ ...draft, userId: e.target.value })}
          >
            <option value="">Tous</option>
            {(users?.items ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end gap-2 sm:col-span-2">
          <Button type="submit" size="sm">
            Filtrer
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft({ action: '', userId: '' });
              setFilters({ action: '', userId: '', page: 1 });
            }}
          >
            Réinitialiser
          </Button>
        </div>
      </form>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState message="Impossible de charger le journal." onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Aucune entrée" message="Aucune action ne correspond aux filtres." />
      ) : (
        <>
          <Table head={['Date', 'Utilisateur', 'Action', 'Entité']}>
            {data.items.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-gray-600">{formatDateTime(log.createdAt)}</td>
                <td className="px-4 py-3 text-gray-900">{log.userName ?? log.userId}</td>
                <td className="px-4 py-3">
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{log.action}</code>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {log.entityType} · <span className="font-mono text-xs">{log.entityId}</span>
                </td>
              </tr>
            ))}
          </Table>
          <nav className="mt-4 flex items-center justify-center gap-2" aria-label="Pagination">
            <Button
              variant="secondary"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              ← Précédent
            </Button>
            <span className="text-sm text-gray-600">
              Page {filters.page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={filters.page >= totalPages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              Suivant →
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
