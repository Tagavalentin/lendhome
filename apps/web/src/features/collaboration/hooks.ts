import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAnnouncement, createReply, fetchThread } from './api';
import { toast } from '@/stores/ui';

export function useResourceThread(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['collaboration', resourceId],
    queryFn: () => fetchThread(resourceId!),
    enabled: Boolean(resourceId),
  });
}

export function useCreateAnnouncement(resourceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { title: string; body: string }) =>
      createAnnouncement(resourceId, v.title, v.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collaboration', resourceId] });
      toast('success', 'Message publié');
    },
    onError: (e) => toast('error', 'Publication impossible', e.message),
  });
}

export function useCreateReply(resourceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { announcementId: string; body: string }) =>
      createReply(v.announcementId, v.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collaboration', resourceId] });
    },
    onError: (e) => toast('error', 'Réponse impossible', e.message),
  });
}
