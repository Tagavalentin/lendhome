import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReservationCreateInput, ReservationUpdateInput } from '@plateforme/shared';
import {
  approveReservation,
  cancelReservation,
  createReservation,
  fetchReservation,
  fetchReservations,
  rejectReservation,
  updateReservation,
} from './api';
import { toast } from '@/stores/ui';
import { ApiError } from '@/lib/api';

export function useReservations(params: Parameters<typeof fetchReservations>[0]) {
  return useQuery({
    queryKey: ['reservations', params],
    queryFn: () => fetchReservations(params),
  });
}

export function useReservation(id: string | undefined) {
  return useQuery({
    queryKey: ['reservations', 'detail', id],
    queryFn: () => fetchReservation(id!),
    enabled: Boolean(id),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['reservations'] });
    qc.invalidateQueries({ queryKey: ['availability'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
  };
}

export function useCreateReservation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ReservationCreateInput) => createReservation(input),
    onSuccess: (res) => {
      invalidate();
      toast(
        'success',
        'Réservation créée',
        res.status === 'pending' ? 'En attente de validation.' : 'Créneau réservé.',
      );
    },
    onError: (e) => {
      if (e instanceof ApiError && e.isConflict) {
        toast('error', 'Créneau déjà pris', 'Veuillez choisir un autre horaire.');
      } else {
        toast('error', 'Réservation impossible', e.message);
      }
    },
  });
}

export function useUpdateReservation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReservationUpdateInput }) =>
      updateReservation(id, input),
    onSuccess: () => {
      invalidate();
      toast('success', 'Réservation modifiée');
    },
    onError: (e) => {
      if (e instanceof ApiError && e.isConflict) {
        toast(
          'error',
          'Créneau déjà pris',
          'Le nouveau créneau chevauche une réservation existante.',
        );
      } else {
        toast('error', 'Modification impossible', e.message);
      }
    },
  });
}

export function useCancelReservation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      invalidate();
      toast('success', 'Réservation annulée');
    },
    onError: (e) => toast('error', 'Annulation impossible', e.message),
  });
}

export function useApproveReservation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: approveReservation,
    onSuccess: () => {
      invalidate();
      toast('success', 'Réservation approuvée');
    },
    onError: (e) => toast('error', 'Approbation impossible', e.message),
  });
}

export function useRejectReservation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectReservation(id, reason),
    onSuccess: () => {
      invalidate();
      toast('success', 'Réservation refusée');
    },
    onError: (e) => toast('error', 'Refus impossible', e.message),
  });
}
