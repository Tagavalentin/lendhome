import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useCancelReservation, useReservations } from '../hooks';
import { ReservationForm } from '../components/ReservationForm';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '@/components/ui/Feedback';
import { Table } from '@/components/ui/Table';
import { ConfirmDialog as Confirm } from '@/components/ui/Modal';
import { formatDateTime, RESERVATION_STATUS_LABELS } from '@/lib/utils';
import type { Reservation, ReservationStatus } from '@plateforme/shared';
import { cn } from '@/lib/utils';

const TONES: Record<ReservationStatus, 'amber' | 'green' | 'red' | 'gray'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: 'gray',
};

export function MyReservationsPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useReservations({ mine: true });
  const cancelMutation = useCancelReservation();
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [toCancel, setToCancel] = useState<Reservation | null>(null);
  const [toEdit, setToEdit] = useState<Reservation | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    const now = Date.now();
    if (filter === 'all') return all;
    if (filter === 'upcoming') return all.filter((r) => new Date(r.end).getTime() > now);
    return all.filter((r) => new Date(r.end).getTime() <= now);
  }, [data, filter]);

  if (isLoading) return <Spinner />;
  if (isError)
    return (
      <ErrorState message="Impossible de charger vos réservations." onRetry={() => refetch()} />
    );

  return (
    <div>
      <PageHeader
        title="Mes réservations"
        description="Vos demandes de réservation de salles et espaces."
      />

      <div className="mb-4 flex gap-2" role="tablist" aria-label="Filtrer par période">
        {(['upcoming', 'past', 'all'] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              filter === f
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300',
            )}
          >
            {f === 'upcoming' ? 'À venir' : f === 'past' ? 'Passées' : 'Toutes'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Aucune réservation"
          message="Parcourez les ressources pour réserver votre premier créneau."
          action={
            <Link to="/ressources">
              <Button>Voir les ressources</Button>
            </Link>
          }
        />
      ) : (
        <Table head={['Ressource', 'Titre', 'Début', 'Fin', 'Participants', 'Statut', 'Actions']}>
          {items.map((r) => {
            const editable =
              r.status !== 'cancelled' && r.status !== 'rejected' && r.userId === user?.id;
            return (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <Link
                    to={`/ressources/${r.resourceId}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {r.resourceName ?? r.resourceId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{r.title}</td>
                <td className="px-4 py-3 text-gray-600">{formatDateTime(r.start)}</td>
                <td className="px-4 py-3 text-gray-600">{formatDateTime(r.end)}</td>
                <td className="px-4 py-3 text-gray-600">{r.participants}</td>
                <td className="px-4 py-3">
                  <Badge tone={TONES[r.status]}>{RESERVATION_STATUS_LABELS[r.status]}</Badge>
                  {r.status === 'rejected' && r.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">{r.rejectionReason}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editable && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setToEdit(r);
                          setEditOpen(true);
                        }}
                      >
                        Modifier
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setToCancel(r)}>
                        Annuler
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      <Confirm
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        title="Annuler la réservation"
        message={`Voulez-vous vraiment annuler « ${toCancel?.title ?? ''} » ? Cette action est définitive.`}
        confirmLabel="Oui, annuler"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => {
          if (toCancel) {
            cancelMutation.mutate(toCancel.id, { onSettled: () => setToCancel(null) });
          }
        }}
      />

      {toEdit && (
        <ReservationForm
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            setToEdit(null);
          }}
          resourceId={toEdit.resourceId}
          resourceName={toEdit.resourceName ?? ''}
          existing={toEdit}
        />
      )}
    </div>
  );
}
