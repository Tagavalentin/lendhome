import { api } from '@/lib/api';
import type { AvailabilityResponse } from '@plateforme/shared';

export function fetchAvailability(resourceId: string, from: string, to: string) {
  return api.get<AvailabilityResponse>(`/api/resources/${resourceId}/availability`, { from, to });
}
