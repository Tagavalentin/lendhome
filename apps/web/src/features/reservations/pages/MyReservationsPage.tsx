import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useCancelReservation, useReservations } from '../hooks';
import { ReservationForm } from '../components/ReservationForm';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback';
import { ConfirmDialog as Confirm } from '@/components/ui/Modal';
import { formatDate, formatTime, RESERVATION_STATUS_LABELS } from '@/lib/utils';
import type { Reservation, ReservationStatus } from '@plateforme/shared';
import { cn } from '@/lib/utils';

const TONES: Record<ReservationStatus, 'amber' | 'green' | 'red' | 'gray'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: 'gray',
};

const BLOCK_COLORS: Record<ReservationStatus, string> = {
  pending: 'bg-accent-100 border-accent-500 text-amber-900',
  approved: 'bg-brand-100 border-brand-500 text-brand-900',
  rejected: 'bg-red-100 border-red-300 text-red-800',
  cancelled: 'bg-gray-100 border-gray-300 text-gray-400',
};

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8h → 20h

function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7; // lundi = 0
  const mon = new Date(d);
  mon.setDate(d.getDate() - day);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function WeekAgenda({ reservations }: { reservations: Reservation[] }) {
  const monday = useMemo(() => startOfWeek(new Date()), []);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
      }),
    [monday],
  );

  const weekStart = monday.getTime();
  const weekEnd = weekStart + 7 * 86400_000;

  const byDay = useMemo(() => {
    const map = new Map<number, Reservation[]>();
    for (const r of reservations) {
      const s = new Date(r.start).getTime();
      if (s < weekStart || s >= weekEnd || r.status === 'cancelled') continue;
      const idx = Math.floor((s - weekStart) / 86400_000);
      const arr = map.get(idx) ?? [];
      arr.push(r);
      map.set(idx, arr);
    }
    return map;
  }, [reservations, weekStart, weekEnd]);

  const hourHeight = 44;

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <div className="min-w-[640px]">
        {/* En-tête jours */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-line">
          <div className="border-r border-line" />
          {days.map((d, i) => (
            <div
              key={i}
              className={cn(
                'border-r border-line px-2 py-2 text-center text-xs last:border-r-0',
                d.toDateString() === new Date().toDateString() && 'bg-brand-50',
              )}
            >
              <p className="font-medium text-gray-500">{DAY_LABELS[i]}</p>
              <p
                className={cn(
                  'text-sm font-semibold',
                  d.toDateString() === new Date().toDateString()
                    ? 'text-brand-700'
                    : 'text-gray-900',
                )}
              >
                {d.getDate()}
              </p>
            </div>
          ))}
        </div>
        {/* Grille heures */}
        <div className="relative grid grid-cols-[48px_repeat(7,1fr)]">
          <div className="border-r border-line">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b border-line px-1 text-right text-[10px] text-gray-400"
                style={{ height: hourHeight }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {days.map((_d, di) => (
            <div key={di} className="relative border-r border-line last:border-r-0">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="border-b border-line"
                  style={{ height: hourHeight }}
                  aria-hidden="true"
                />
              ))}
              {(byDay.get(di) ?? []).map((r) => {
                const s = new Date(r.start);
                const e = new Date(r.end);
                const top = (s.getHours() + s.getMinutes() / 60 - 8) * hourHeight;
                const height = Math.max(18, ((e.getTime() - s.getTime()) / 3600_000) * hourHeight);
                return (
                  <div
                    key={r.id}
                    title={`${r.title} — ${formatTime(r.start)} à ${formatTime(r.end)}`}
                    className={cn(
                      'absolute inset-x-1 overflow-hidden rounded border-l-2 px-1.5 py-0.5 text-[11px] font-medium leading-tight',
                      BLOCK_COLORS[r.status],
                    )}
                    style={{ top, height }}
                  >
                    <p className="truncate">{r.resourceName ?? r.title}</p>
                    <p className="truncate opacity-80">
                      {formatTime(r.start)} - {formatTime(r.end)}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MyReservationsPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useReservations({ mine: true });
  const cancelMutation = useCancelReservation();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [toCancel, setToCancel] = useState<Reservation | null>(null);
  const [toEdit, setToEdit] = useState<Reservation | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const all = data?.items ?? [];
    const now = Date.now();
    return {
      upcoming: all.filter((r) => new Date(r.end).getTime() > now),
      past: all.filter((r) => new Date(r.end).getTime() <= now),
    };
  }, [data]);

  const list = tab === 'upcoming' ? upcoming : past;

  const hasWeekReservations = useMemo(() => {
    const mon = startOfWeek(new Date()).getTime();
    const sun = mon + 7 * 86400_000;
    return (data?.items ?? []).some((r) => {
      const s = new Date(r.start).getTime();
      return s >= mon && s < sun && r.status !== 'cancelled';
    });
  }, [data]);

  if (isLoading) return <Spinner />;
  if (isError)
    return (
      <ErrorState message="Impossible de charger vos réservations." onRetry={() => refetch()} />
    );

  const weekLabel = (() => {
    const mon = startOfWeek(new Date());
    const sun = new Date(mon.getTime() + 6 * 86400_000);
    return `${mon.getDate()} - ${sun.getDate()} ${sun.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  })();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes réservations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Vos salles et vos prêts de matériel, semaine par semaine.
          </p>
        </div>
        <Link to="/ressources">
          <Button>Nouvelle réservation</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agenda */}
        <div className="lg:col-span-2">
          <p className="mb-2 text-sm font-medium text-gray-600">Semaine du {weekLabel}</p>
          {!hasWeekReservations ? (
            <EmptyState
              title="Aucune réservation cette semaine"
              message="Vos créneaux réservés apparaîtront ici."
            />
          ) : (
            <WeekAgenda reservations={[...upcoming, ...past]} />
          )}
        </div>

        {/* Liste À venir / Historique */}
        <div>
          <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1" role="tablist">
            {(
              [
                ['upcoming', 'À venir'],
                ['past', 'Historique'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
                  tab === key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <EmptyState
              title={tab === 'upcoming' ? 'Aucune réservation à venir' : 'Aucun historique'}
              message={
                tab === 'upcoming'
                  ? 'Parcourez les ressources pour réserver votre premier créneau.'
                  : 'Vos réservations passées apparaîtront ici.'
              }
              action={
                tab === 'upcoming' ? (
                  <Link to="/ressources">
                    <Button size="sm">Voir les ressources</Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-3">
              {list.map((r) => {
                const editable =
                  r.status !== 'cancelled' && r.status !== 'rejected' && r.userId === user?.id;
                return (
                  <li key={r.id} className="rounded-xl border border-line bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/ressources/${r.resourceId}`}
                          className="font-semibold text-gray-900 hover:text-brand-700"
                        >
                          {r.resourceName ?? r.title}
                        </Link>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {r.title} · {formatDate(r.start)} · {formatTime(r.start)} -{' '}
                          {formatTime(r.end)}
                        </p>
                      </div>
                      <Badge tone={TONES[r.status]}>{RESERVATION_STATUS_LABELS[r.status]}</Badge>
                    </div>
                    {r.status === 'rejected' && r.rejectionReason && (
                      <p className="mt-1 text-xs text-red-600">{r.rejectionReason}</p>
                    )}
                    {editable && (
                      <div className="mt-3 flex gap-2">
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
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

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
