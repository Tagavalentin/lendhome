import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useApproveReservation, useRejectReservation, useReservations } from '../hooks';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '@/components/ui/Feedback';
import { Table } from '@/components/ui/Table';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Field, Textarea } from '@/components/ui/Input';
import { formatDateTime, RESERVATION_STATUS_LABELS } from '@/lib/utils';
import type { Reservation, ReservationStatus } from '@plateforme/shared';

const TONES: Record<ReservationStatus, 'amber' | 'green' | 'red' | 'gray'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: 'gray',
};

export function ReservationRequestsPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useReservations({});
  const approve = useApproveReservation();
  const reject = useRejectReservation();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [toReject, setToReject] = useState<Reservation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmApprove, setConfirmApprove] = useState<Reservation | null>(null);

  const canManage = user?.role === 'manager' || user?.role === 'admin';
  const items = (data?.items ?? []).filter((r) => !statusFilter || r.status === statusFilter);

  if (isLoading) return <Spinner />;
  if (isError)
    return (
      <ErrorState message="Impossible de charger les réservations." onRetry={() => refetch()} />
    );

  return (
    <div>
      <PageHeader
        title="Demandes de réservation"
        description="Toutes les réservations de la plateforme."
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {['pending', 'approved', 'rejected', 'cancelled', ''].map((s) => (
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
            {s ? RESERVATION_STATUS_LABELS[s as ReservationStatus] : 'Toutes'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Aucune demande"
          message="Il n'y a aucune réservation dans cette catégorie."
        />
      ) : (
        <Table head={['Ressource', 'Titre', 'Par', 'Début', 'Fin', 'Statut', 'Actions']}>
          {items.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{r.resourceName}</td>
              <td className="px-4 py-3 text-gray-700">{r.title}</td>
              <td className="px-4 py-3 text-gray-600">{r.userName}</td>
              <td className="px-4 py-3 text-gray-600">{formatDateTime(r.start)}</td>
              <td className="px-4 py-3 text-gray-600">{formatDateTime(r.end)}</td>
              <td className="px-4 py-3">
                <Badge tone={TONES[r.status]}>{RESERVATION_STATUS_LABELS[r.status]}</Badge>
              </td>
              <td className="px-4 py-3">
                {canManage && r.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setConfirmApprove(r)}>
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setToReject(r);
                        setRejectReason('');
                      }}
                    >
                      Refuser
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <ConfirmDialog
        open={Boolean(confirmApprove)}
        onClose={() => setConfirmApprove(null)}
        title="Approuver la réservation"
        message={`Approuver « ${confirmApprove?.title ?? ''} » pour ${confirmApprove?.userName ?? ''} ?`}
        confirmLabel="Approuver"
        loading={approve.isPending}
        onConfirm={() => {
          if (confirmApprove)
            approve.mutate(confirmApprove.id, { onSettled: () => setConfirmApprove(null) });
        }}
      />

      <Modal
        open={Boolean(toReject)}
        onClose={() => setToReject(null)}
        title="Refuser la réservation"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setToReject(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              loading={reject.isPending}
              onClick={() => {
                if (toReject) {
                  reject.mutate(
                    { id: toReject.id, reason: rejectReason || undefined },
                    { onSettled: () => setToReject(null) },
                  );
                }
              }}
            >
              Refuser
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-gray-600">
          Refuser « {toReject?.title ?? ''} » ({toReject?.userName}). Le motif sera visible par
          l'utilisateur.
        </p>
        <Field label="Motif du refus (optionnel)" htmlFor="reject-reason">
          <Textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}
