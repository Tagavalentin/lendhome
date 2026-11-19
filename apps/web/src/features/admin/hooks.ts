import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '@plateforme/shared';
import { fetchAuditLogs, fetchUsers, updateUser } from './api';
import { toast } from '@/stores/ui';

export function useUsers() {
  return useQuery({ queryKey: ['admin', 'users'], queryFn: fetchUsers });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateUser(id, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast('success', 'Rôle mis à jour');
    },
    onError: (e) => toast('error', 'Mise à jour impossible', e.message),
  });
}

export function useAuditLogs(params: Parameters<typeof fetchAuditLogs>[0]) {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => fetchAuditLogs(params),
    placeholderData: (prev) => prev,
  });
}
