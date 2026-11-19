import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  reservationCreateSchema,
  type Reservation,
  type ReservationCreateInput,
} from '@plateforme/shared';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { useCreateReservation, useUpdateReservation } from '../hooks';
import { ApiError } from '@/lib/api';
import { useState } from 'react';

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string) {
  return new Date(v).toISOString();
}

interface Props {
  open: boolean;
  onClose: () => void;
  resourceId: string;
  resourceName: string;
  maxCapacity?: number;
  initialStart?: string;
  initialEnd?: string;
  existing?: Reservation | null;
}

export function ReservationForm({
  open,
  onClose,
  resourceId,
  resourceName,
  maxCapacity,
  initialStart,
  initialEnd,
  existing,
}: Props) {
  const createMutation = useCreateReservation();
  const updateMutation = useUpdateReservation();
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const loading = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReservationCreateInput>({
    resolver: zodResolver(reservationCreateSchema),
    defaultValues: {
      resourceId,
      title: '',
      purpose: '',
      start: '',
      end: '',
      participants: 1,
    },
  });

  useEffect(() => {
    if (open) {
      setConflictMsg(null);
      reset({
        resourceId,
        title: existing?.title ?? '',
        purpose: existing?.purpose ?? '',
        start: existing
          ? toLocalInput(existing.start)
          : initialStart
            ? toLocalInput(initialStart)
            : '',
        end: existing ? toLocalInput(existing.end) : initialEnd ? toLocalInput(initialEnd) : '',
        participants: existing?.participants ?? 1,
      });
    }
  }, [open, resourceId, initialStart, initialEnd, existing, reset]);

  const onSubmit = async (values: ReservationCreateInput) => {
    setConflictMsg(null);
    const payload = {
      ...values,
      start: fromLocalInput(values.start),
      end: fromLocalInput(values.end),
    };
    try {
      if (existing) {
        await updateMutation.mutateAsync({ id: existing.id, input: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.isConflict) {
        setConflictMsg('Ce créneau est déjà réservé. Choisissez un autre horaire.');
      }
      // Les toasts d'erreur sont gérés par les mutations.
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Modifier la réservation' : 'Nouvelle réservation'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" form="reservation-form" loading={loading}>
            {existing ? 'Enregistrer' : 'Réserver'}
          </Button>
        </div>
      }
    >
      <form
        id="reservation-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <span className="font-medium">Ressource :</span> {resourceName}
        </div>

        <Field label="Titre" htmlFor="res-title" error={errors.title?.message} required>
          <Input id="res-title" placeholder="Ex : Réunion d'équipe" {...register('title')} />
        </Field>

        <Field label="Motif" htmlFor="res-purpose" error={errors.purpose?.message} required>
          <Textarea
            id="res-purpose"
            placeholder="Décrivez l'objet de la réservation…"
            {...register('purpose')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Début" htmlFor="res-start" error={errors.start?.message} required>
            <Input id="res-start" type="datetime-local" {...register('start')} />
          </Field>
          <Field label="Fin" htmlFor="res-end" error={errors.end?.message} required>
            <Input id="res-end" type="datetime-local" {...register('end')} />
          </Field>
        </div>

        <Field
          label="Participants"
          htmlFor="res-participants"
          error={errors.participants?.message}
          required
          hint={maxCapacity ? `Capacité : ${maxCapacity} places` : undefined}
        >
          <Input
            id="res-participants"
            type="number"
            min={1}
            max={maxCapacity}
            {...register('participants', { valueAsNumber: true })}
          />
        </Field>

        {conflictMsg && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {conflictMsg}
          </p>
        )}
      </form>
    </Modal>
  );
}
