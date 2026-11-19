import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { fetchOverviewStats } from '../api';
import { useReservations } from '@/features/reservations/hooks';
import { useLoans } from '@/features/loans/hooks';
import { Card, PageHeader, Spinner } from '@/components/ui/Feedback';
import { formatDateTime } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone ?? 'text-gray-900'}`}>{value}</p>
    </Card>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
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

  return (
    <div>
      <PageHeader
        title={`Bonjour, ${user?.firstName ?? ''}`}
        description="Vue d'ensemble de la plateforme."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Réservations cette semaine" value={s?.reservationsThisWeek ?? '—'} />
        <StatCard
          label="Demandes en attente"
          value={s?.pendingReservations ?? '—'}
          tone={s && s.pendingReservations > 0 ? 'text-amber-600' : undefined}
        />
        <StatCard label="Prêts en cours" value={s?.activeLoans ?? '—'} />
        <StatCard
          label="Prêts en retard"
          value={s?.overdueLoans ?? '—'}
          tone={s && s.overdueLoans > 0 ? 'text-red-600' : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-4 font-semibold text-gray-900">Réservations sur 7 jours</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s?.reservationsByDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) =>
                    new Date(d).toLocaleDateString('fr-FR', { weekday: 'short' })
                  }
                  fontSize={12}
                />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip labelFormatter={(d) => new Date(String(d)).toLocaleDateString('fr-FR')} />
                <Bar dataKey="count" name="Réservations" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="mb-3 font-semibold text-gray-900">Prochaines réservations</h2>
            {nextReservations.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune réservation à venir.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {nextReservations.map((r) => (
                  <li key={r.id} className="py-2 text-sm">
                    <p className="font-medium text-gray-900">{r.title}</p>
                    <p className="text-gray-500">
                      {r.resourceName} · {formatDateTime(r.start)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 font-semibold text-gray-900">Mes prêts en cours</h2>
            {myActiveLoans.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun prêt en cours.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {myActiveLoans.map((l) => (
                  <li key={l.id} className="py-2 text-sm">
                    <p className="font-medium text-gray-900">{l.resourceName}</p>
                    <p className="text-gray-500">
                      Retour prévu le {new Date(l.plannedEnd).toLocaleDateString('fr-FR')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
