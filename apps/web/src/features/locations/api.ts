import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Location, Paginated } from '@plateforme/shared';
import { toFrontendLocation } from '@/lib/backend';
import type { BackendLocation } from '@/lib/backend';

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await api.get<BackendLocation[]>('/api/locations');
      const items = res.map(toFrontendLocation);
      const paginated: Paginated<Location> = {
        items,
        total: items.length,
        page: 1,
        pageSize: items.length || 1,
      };
      return paginated;
    },
    staleTime: 5 * 60_000,
  });
}
