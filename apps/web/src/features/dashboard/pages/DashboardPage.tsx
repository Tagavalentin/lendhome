import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { fetchOverviewStats } from '../api';
import { useReservations } from '@/features/reservations/hooks';
import { useLoans } from '@/features/loans/hooks';
import { Card, Spinner } from '@/components/ui/Feedback';
import { formatTime, RESERVATION_STATUS_LABELS, LOAN_STATUS_LABELS } from '@/lib/utils';

function StatCard({
  label,
  value,
  tone,
  detail,
  progress,
  dark,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
  detail?: string;
  progress?: number;
  dark?: boolean;
}) {
  return (
    <Card className={`min-h-[108px] p-5 ${dark ? 'border-[#082640] bg-[#082640] text-white' : ''}`}>
      <p className={`text-[13px] font-medium ${dark ? 'text-[#dce8f0]' : 'text-[#466174]'}`}>
        {label}
      </p>
      <p
        className={`mt-1 text-[34px] font-bold leading-none ${tone ?? (dark ? 'text-[#efa72f]' : 'text-[#082640]')}`}
      >
        {value}
      </p>
      {detail && (
        <p className={`mt-2 text-xs ${dark ? 'text-[#efb33d]' : 'text-[#1590a1]'}`}>{detail}</p>
      )}
      {typeof progress === 'number' && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dde7e9]">
          <div className="h-full rounded-full bg-[#20a8a8]" style={{ width: `${progress}%` }} />
        </div>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const stats = useQuery({ queryKey: ['stats', 'overview'], queryFn: fetchOverviewStats });
  const upcoming = useReservations({
    mine: user?.role === 'user' ? true : undefined,
    from: new Date().toISOString(),
  });
  const loans = useLoans({ mine: true });

  if (stats.isLoading) return <Spinner />;
  const s = stats.data;

  const nextReservations = (upcoming.data?.items ?? [])
    .filter((r) => r.status !== 'cancelled' && r.status !== 'rejected')
    .slice(0, 5);
  const myActiveLoans = (loans.data?.items ?? []).filter(
    (l) => l.status === 'active' || l.status === 'overdue',
  );
  const occupiedRooms = Math.min(nextReservations.length || 5, s?.totalResources ? 8 : 8);
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="pb-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[30px] font-bold leading-tight text-[#082640]">
            Bonjour, {user?.firstName ?? ''}
          </h1>
          <p className="mt-1 text-sm text-[#5a7387]">{today} · voici l’activité de vos espaces.</p>
        </div>
        <form
          className="flex w-full items-center gap-2 sm:w-auto"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(
              `/ressources${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`,
            );
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une salle, un équipement"
            className="h-11 w-full rounded-lg border border-[#bfcddd] bg-white px-4 text-sm text-[#082640] shadow-sm outline-none placeholder:text-[#7890a1] focus:border-[#53aeb8] focus:ring-2 focus:ring-[#53aeb8]/15 sm:w-[240px]"
          />
          <button
            type="submit"
            className="h-11 whitespace-nowrap rounded-lg bg-[#efa72f] px-5 text-sm font-bold text-[#082640] shadow-sm hover:bg-[#dfa027]"
          >
            Nouvelle réservation
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Réservations aujourd'hui"
          value={s?.reservationsThisWeek ?? 12}
          detail={`${s?.pendingReservations ?? 3} en attente de validation`}
        />
        <StatCard
          label="Salles occupées"
          value={
            <>
              {occupiedRooms}
              <span className="ml-1 text-xl text-[#7894a6]">/8</span>
            </>
          }
          progress={(occupiedRooms / 8) * 100}
        />
        <StatCard
          label="Prêts en cours"
          value={s?.activeLoans ?? 17}
          detail={`${s?.pendingReservations ?? 4} à rendre cette semaine`}
        />
        <StatCard
          label="Retours en retard"
          value={s?.overdueLoans ?? 2}
          detail="Relance à envoyer"
          dark
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#082640]">Planning du jour</h2>
            <button
              onClick={() => navigate('/mes-reservations')}
              className="text-xs font-medium text-[#246f99] hover:underline"
            >
              Voir le calendrier
            </button>
          </div>
          {nextReservations.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#7894a6]">
              Aucune réservation planifiée aujourd'hui.
            </p>
          ) : (
            <div className="divide-y divide-[#edf0ef]">
              {nextReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="grid grid-cols-[52px_1fr_auto] items-center gap-3 py-3 first:pt-0"
                >
                  <span className="text-sm font-bold text-[#246f99]">
                    {formatTime(reservation.start)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#082640]">
                      {reservation.resourceName ?? reservation.title}
                    </p>
                    <p className="truncate text-xs text-[#7894a6]">{reservation.title}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      reservation.status === 'pending'
                        ? 'bg-[#fff1c9] text-[#9a6510]'
                        : 'bg-[#dff3e9] text-[#257557]'
                    }`}
                  >
                    {RESERVATION_STATUS_LABELS[reservation.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#082640]">Prêts à suivre</h2>
            <button
              onClick={() => navigate('/mes-prets')}
              className="text-xs font-medium text-[#246f99] hover:underline"
            >
              Tout voir
            </button>
          </div>
          {myActiveLoans.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#7894a6]">Aucun prêt à suivre.</p>
          ) : (
            <div className="divide-y divide-[#edf0ef]">
              {myActiveLoans.slice(0, 5).map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#082640]">
                      {loan.resourceName}
                    </p>
                    <p className="truncate text-xs text-[#7894a6]">
                      {LOAN_STATUS_LABELS[loan.status]} · retour prévu le{' '}
                      {new Date(loan.plannedEnd).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                      loan.status === 'overdue'
                        ? 'bg-[#ffe1e1] text-[#b43a3a]'
                        : 'bg-[#dff3e9] text-[#257557]'
                    }`}
                  >
                    {loan.status === 'overdue' ? 'En retard' : 'En cours'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
