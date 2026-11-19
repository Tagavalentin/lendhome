import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoans } from '../hooks';
import { LoanRequestForm } from '../components/LoanRequestForm';
import { useResource } from '@/features/resources/hooks';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '@/components/ui/Feedback';
import { Table } from '@/components/ui/Table';
import { formatDate, LOAN_STATUS_LABELS } from '@/lib/utils';
import type { LoanStatus } from '@plateforme/shared';
import { cn } from '@/lib/utils';

const TONES: Record<LoanStatus, 'amber' | 'blue' | 'green' | 'red'> = {
  requested: 'amber',
  active: 'blue',
  returned: 'green',
  overdue: 'red',
};

export function MyLoansPage() {
  const { data, isLoading, isError, refetch } = useLoans({ mine: true });
  const [borrowFor, setBorrowFor] = useState<string | null>(null);
  const { data: borrowResource } = useResource(borrowFor ?? undefined);

  const items = useMemo(() => data?.items ?? [], [data]);
  const overdue = items.filter((l) => l.status === 'overdue').length;

  if (isLoading) return <Spinner />;
  if (isError)
    return <ErrorState message="Impossible de charger vos prêts." onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader
        title="Mes prêts"
        description="Suivi de vos emprunts de matériel."
        actions={
          <Link to="/ressources?type=equipment">
            <Button>Emprunter du matériel</Button>
          </Link>
        }
      />

      {overdue > 0 && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          ⚠️ {overdue} prêt{overdue > 1 ? 's' : ''} en retard de retour. Merci de rapporter le
          matériel dès que possible.
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Aucun prêt"
          message="Parcourez les équipements pour faire une demande d'emprunt."
          action={
            <Link to="/ressources?type=equipment">
              <Button variant="secondary">Voir les équipements</Button>
            </Link>
          }
        />
      ) : (
        <Table head={['Équipement', 'Sortie prévue', 'Retour prévu', 'Statut', 'Condition']}>
          {items.map((l) => {
            const isOverdue =
              l.status === 'overdue' ||
              (l.status === 'active' && new Date(l.plannedEnd).getTime() < Date.now());
            return (
              <tr key={l.id} className={cn(isOverdue && 'bg-red-50/60')}>
                <td className="px-4 py-3">
                  <Link
                    to={`/ressources/${l.resourceId}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {l.resourceName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDate(l.plannedStart)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {formatDate(l.plannedEnd)}
                  {isOverdue && (
                    <Badge tone="red" className="ml-2">
                      En retard
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={isOverdue ? 'red' : TONES[l.status]}>
                    {LOAN_STATUS_LABELS[l.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {l.conditionIn
                    ? `Retour : ${l.conditionIn}`
                    : l.conditionOut
                      ? `Sortie : ${l.conditionOut}`
                      : '—'}
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {borrowResource && (
        <LoanRequestForm
          open={Boolean(borrowFor)}
          onClose={() => setBorrowFor(null)}
          resourceId={borrowResource.id}
          resourceName={borrowResource.name}
        />
      )}
    </div>
  );
}
