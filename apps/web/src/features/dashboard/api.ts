import { api } from '@/lib/api';

export interface OverviewStats {
  reservationsThisWeek: number;
  pendingReservations: number;
  activeLoans: number;
  overdueLoans: number;
  totalResources: number;
  totalUsers: number;
  reservationsByDay: { date: string; count: number }[];
}

export function fetchOverviewStats() {
  return api.get<OverviewStats>('/api/stats/overview');
}
