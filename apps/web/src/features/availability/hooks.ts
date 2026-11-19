import { useQuery } from '@tanstack/react-query';
import { fetchAvailability } from './api';

export function useAvailability(resourceId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ['availability', resourceId, from, to],
    queryFn: () => fetchAvailability(resourceId!, from, to),
    enabled: Boolean(resourceId),
    staleTime: 15_000,
  });
}
