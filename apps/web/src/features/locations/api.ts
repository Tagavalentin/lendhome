import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Location, Paginated } from '@plateforme/shared';

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: () =>
      api
        .get<Paginated<Location> | Location[]>('/api/locations')
        .then((res) =>
          Array.isArray(res)
            ? { items: res, total: res.length, page: 1, pageSize: res.length }
            : res,
        ),
    staleTime: 5 * 60_000,
  });
}
