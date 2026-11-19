import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useCheckoutLoan, useLoans, useReturnLoan } from '../hooks';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '@/components/ui/Feedback';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { formatDate, LOAN_STATUS_LABELS } from '@/lib/utils';
import type { Loan, LoanStatus } from '@plateforme/shared';

const TONES: Record<LoanStatus, 'amber' | 'blue' | 'green' | 'red'> = {
  requested: 'amber',
  active: 'blue',
  returned: 'green',
  overdue: 'red',
};

export function LoanRequestsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'manager' || user?.role === 'admin';
  const { data, isLoading, isError, refetch } = useLoans({});
  const checkout = useCheckoutLoan();
  const returnLoan = useReturnLoan();
  const [statusFilter, setStatusFilter] = useState('');
  const [toReturn, setToReturn] = useState<Loan | null>(null);
  const [conditionIn, setConditionIn] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  const items = (data?.items ?? []).filter((l) => !statusFilter || l.status === statusFilter);

  if (isLoading) return <Spinner />;
  if (isError)
    return <ErrorState message="Impossible de charger les prêts." onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader title="Prêts de matériel" description="Demandes et historique des emprunts." />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {['', 'requested', 'active', 'overdue', 'returned'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            aria-pressed={statusFilter === s}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              statusFilter === s
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300'
            }`}
          >
            {s ? LOAN_STATUS_LABELS[s as LoanStatus] : 'Tous'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState title="Aucun prêt" message="Aucune demande dans cette catégorie." />
      ) : (
        <Table head={['Équipement', 'Emprunteur', 'Sortie', 'Retour prévu', 'Statut', 'Actions']}>
          {items.map((l) => {
            const isOverdue =
              l.status === 'overdue' ||
              (l.status === 'active' && new Date(l.plannedEnd).getTime() < Date.now());
            return (
              <tr key={l.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{l.resourceName}</td>
                <td className="px-4 py-3 text-gray-600">{l.userName}</td>
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
                <td className="px-4 py-3">
                  {canManage && l.status === 'requested' && (
                    <Button
                      size="sm"
                      onClick={() => checkout.mutate(l.id)}
                      loading={checkout.isPending}
                    >
                      Remettre le matériel
                    </Button>
                  )}
                  {canManage && (l.status === 'active' || isOverdue) && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => {
                        setToReturn(l);
                        setConditionIn('');
                        setReturnNotes('');
                      }}
                    >
                      Enregistrer le retour
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      <Modal
        open={Boolean(toReturn)}
        onClose={() => setToReturn(null)}
        title="Enregistrer le retour"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setToReturn(null)}>
              Annuler
            </Button>
            <Button
              variant="success"
              loading={returnLoan.isPending}
              disabled={!conditionIn.trim()}
              onClick={() => {
                if (toReturn) {
                  returnLoan.mutate(
                    {
                      id: toReturn.id,
                      input: { conditionIn: conditionIn.trim(), notes: returnNotes || undefined },
                    },
                    { onSettled: () => setToReturn(null) },
                  );
                }
              }}
            >
              Valider le retour
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-gray-600">
          Retour de « {toReturn?.resourceName} » emprunté par {toReturn?.userName}.
        </p>
        <div className="space-y-3">
          <Field label="État du matériel au retour" htmlFor="cond-in" required>
            <Input
              id="cond-in"
              value={conditionIn}
              onChange={(e) => setConditionIn(e.target.value)}
              placeholder="Ex : Bon état, rayure légère…"
            />
          </Field>
          <Field label="Notes" htmlFor="ret-notes">
            <Textarea
              id="ret-notes"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
