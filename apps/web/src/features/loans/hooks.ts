import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoanCreateInput, LoanReturnInput } from '@plateforme/shared';
import { checkoutLoan, createLoan, fetchLoans, returnLoan } from './api';
import { toast } from '@/stores/ui';
import { ApiError } from '@/lib/api';

export function useLoans(params: Parameters<typeof fetchLoans>[0]) {
  return useQuery({
    queryKey: ['loans', params],
    queryFn: () => fetchLoans(params),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['loans'] });
    qc.invalidateQueries({ queryKey: ['resources'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
  };
}

export function useCreateLoan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: LoanCreateInput) => createLoan(input),
    onSuccess: () => {
      invalidate();
      toast('success', 'Demande de prêt envoyée');
    },
    onError: (e) => {
      if (e instanceof ApiError && e.isConflict) {
        toast('error', 'Équipement indisponible', e.message);
      } else {
        toast('error', 'Demande impossible', e.message);
      }
    },
  });
}

export function useReturnLoan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LoanReturnInput }) => returnLoan(id, input),
    onSuccess: () => {
      invalidate();
      toast('success', 'Retour enregistré');
    },
    onError: (e) => toast('error', 'Retour impossible', e.message),
  });
}

export function useCheckoutLoan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: checkoutLoan,
    onSuccess: () => {
      invalidate();
      toast('success', 'Prêt remis à l’emprunteur');
    },
    onError: (e) => toast('error', 'Opération impossible', e.message),
  });
}
