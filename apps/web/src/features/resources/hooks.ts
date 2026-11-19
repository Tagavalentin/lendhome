import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ResourceFilters } from '@plateforme/shared';
import { createResource, fetchResource, fetchResources, updateResource } from './api';
import { toast } from '@/stores/ui';

export function useResources(filters: ResourceFilters) {
  return useQuery({
    queryKey: ['resources', filters],
    queryFn: ({ signal }) => fetchResources(filters, signal),
    placeholderData: (prev) => prev,
  });
}

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: ['resources', 'detail', id],
    queryFn: () => fetchResource(id!),
    enabled: Boolean(id),
  });
}

export function useCreateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources'] });
      toast('success', 'Ressource créée');
    },
    onError: (e) => toast('error', 'Création impossible', e.message),
  });
}

export function useUpdateResource(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<import('@plateforme/shared').Resource>) =>
      updateResource(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources'] });
      toast('success', 'Ressource mise à jour');
    },
    onError: (e) => toast('error', 'Mise à jour impossible', e.message),
  });
}
