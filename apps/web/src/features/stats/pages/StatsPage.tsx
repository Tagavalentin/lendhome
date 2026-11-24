import { useMemo } from 'react';
import { useReservations } from '@/features/reservations/hooks';
import { useLoans } from '@/features/loans/hooks';
import { Card, ErrorState, Spinner } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Index jour de semaine façon français : lundi = 0 … dimanche = 6. */
function frWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function StatsPage() {
  const reservations = useReservations({});
  const loans = useLoans({});

  const stats = useMemo(() => {
    const since = Date.now() - 30 * DAY_MS;
    const items = (reservations.data?.items ?? []).filter((r) => {
      if (r.status === 'cancelled' || r.status === 'rejected') return false;
      return new Date(r.start).getTime() >= since;
    });

    // Réservations par jour de la semaine (sur les 30 derniers jours)
    const perDay = [0, 0, 0, 0, 0, 0, 0];
    for (const r of items) perDay[frWeekday(new Date(r.start))]++;
    const maxDay = Math.max(...perDay, 1);

    // Ressources les plus demandées
    const counts = new Map<string, { name: string; count: number }>();
    for (const r of items) {
      const key = r.resourceId || r.resourceName || 'inconnue';
      const cur = counts.get(key) ?? { name: r.resourceName ?? 'Ressource', count: 0 };
      cur.count++;
      counts.set(key, cur);
    }
    const top = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const maxTop = Math.max(...top.map((t) => t.count), 1);

    const loanItems = loans.data?.items ?? [];
    return {
      totalReservations: items.length,
      perDay,
      maxDay,
      top,
      maxTop,
      activeLoans: loanItems.filter((l) => l.status === 'active' || l.status === 'overdue').length,
      overdueLoans: loanItems.filter((l) => l.status === 'overdue').length,
    };
  }, [reservations.data, loans.data]);

  if (reservations.isLoading || loans.isLoading) return <Spinner />;
  if (reservations.isError || loans.isError) {
    return (
      <ErrorState
        message="Impossible de charger les statistiques."
        onRetry={() => {
          reservations.refetch();
          loans.refetch();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <p className="mt-1 text-sm text-gray-500">Activité des espaces et du matériel.</p>
        </div>
        <span className="ml-auto rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          30 derniers jours
        </span>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[13px] font-medium text-[#466174]">Réservations</p>
          <p className="mt-1 text-3xl font-bold text-[#082640]">{stats.totalReservations}</p>
          <p className="mt-1 text-xs text-[#1590a1]">sur la période</p>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] font-medium text-[#466174]">Prêts en cours</p>
          <p className="mt-1 text-3xl font-bold text-[#082640]">{stats.activeLoans}</p>
          <p className="mt-1 text-xs text-[#1590a1]">équipements empruntés</p>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] font-medium text-[#466174]">Retours en retard</p>
          <p
            className={cn(
              'mt-1 text-3xl font-bold',
              stats.overdueLoans > 0 ? 'text-red-600' : 'text-[#082640]',
            )}
          >
            {stats.overdueLoans}
          </p>
          <p className="mt-1 text-xs text-gray-500">à relancer</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-base font-bold text-[#082640]">Réservations par jour</h2>
          <div className="flex h-48 items-end justify-between gap-3">
            {stats.perDay.map((count, i) => (
              <div key={WEEKDAYS[i]} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] font-semibold text-gray-500">{count || ''}</span>
                <div
                  className={cn(
                    'w-full max-w-[42px] rounded-t-md',
                    count > 0 ? 'bg-brand-500' : 'bg-gray-100',
                  )}
                  style={{
                    height: `${Math.max((count / stats.maxDay) * 140, count > 0 ? 6 : 4)}px`,
                  }}
                  title={`${count} réservation${count > 1 ? 's' : ''}`}
                />
                <span className="text-xs font-medium text-gray-500">{WEEKDAYS[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-base font-bold text-[#082640]">Ressources les plus demandées</h2>
          {stats.top.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              Aucune réservation sur la période.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.top.map((r, i) => (
                <div key={r.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">
                      <span className="mr-2 text-gray-400">{i + 1}.</span>
                      {r.name}
                    </span>
                    <span className="font-semibold text-brand-700">{r.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(r.count / stats.maxTop) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
