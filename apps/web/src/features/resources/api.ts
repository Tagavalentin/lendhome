import { api } from '@/lib/api';
import type { Paginated, Resource, ResourceFilters } from '@plateforme/shared';

export function fetchResources(filters: ResourceFilters, signal?: AbortSignal) {
  return api.get<Paginated<Resource>>('/api/resources', { ...filters }, signal);
}

export function fetchResource(id: string) {
  return api.get<Resource>(`/api/resources/${id}`);
}

export function createResource(input: Partial<Resource>) {
  return api.post<Resource>('/api/resources', input);
}

export function updateResource(id: string, input: Partial<Resource>) {
  return api.patch<Resource>(`/api/resources/${id}`, input);
}
