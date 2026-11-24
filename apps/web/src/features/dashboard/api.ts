import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { fetchReservations } from '@/features/reservations/api';
import { fetchLoans } from '@/features/loans/api';
import { fetchResources } from '@/features/resources/api';

export interface OverviewStats {
  reservationsThisWeek: number;
  pendingReservations: number;
  activeLoans: number;
  overdueLoans: number;
  totalResources: number;
  totalUsers: number;
  reservationsByDay: { date: string; count: number }[];
}

interface BackendAdminStats {
  users?: { total?: number };
  auditLogs?: { total?: number };
}

/**
 * Le backend n'expose pas de endpoint « stats » transverse : on agrège
 * côté client depuis les endpoints existants (admin/stats pour les admins).
 */
export async function fetchOverviewStats(): Promise<OverviewStats> {
  const role = useAuthStore.getState().user?.role;
  const isManager = role === 'manager' || role === 'admin';

  const [reservations, loans, resources, adminStats] = await Promise.all([
    fetchReservations({}),
    fetchLoans({}),
    fetchResources({ pageSize: 100 }),
    isManager
      ? api.get<BackendAdminStats>('/api/admin/stats').catch(() => undefined)
      : Promise.resolve(undefined),
  ]);

  const now = Date.now();
  const weekEnd = now + 7 * 86400_000;
  const resItems = reservations.items ?? [];
  const loanItems = loans.items ?? [];

  const reservationsThisWeek = resItems.filter((r) => {
    const s = new Date(r.start).getTime();
    return s >= now && s <= weekEnd && r.status !== 'cancelled' && r.status !== 'rejected';
  }).length;

  const byDayMap = new Map<string, number>();
  for (const r of resItems) {
    if (r.status === 'cancelled' || r.status === 'rejected') continue;
    const day = r.start.slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
  }

  return {
    reservationsThisWeek,
    pendingReservations: resItems.filter((r) => r.status === 'pending').length,
    activeLoans: loanItems.filter((l) => l.status === 'active' || l.status === 'overdue').length,
    overdueLoans: loanItems.filter((l) => l.status === 'overdue').length,
    totalResources: resources.total ?? resources.items.length,
    totalUsers: adminStats?.users?.total ?? 0,
    reservationsByDay: [...byDayMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
