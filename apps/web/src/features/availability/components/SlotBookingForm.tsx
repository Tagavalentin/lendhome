import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Resource } from '@plateforme/shared';
import { useAvailability } from '../hooks';
import { useCreateReservation } from '@/features/reservations/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

function toDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function SlotBookingForm({ resource }: { resource: Resource }) {
  const today = toDateInput(new Date());
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<{ start: string; end: string } | null>(null);
  const [participants, setParticipants] = useState(1);
  const [motif, setMotif] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const dayStart = useMemo(() => new Date(`${date}T00:00:00`).toISOString(), [date]);
  const dayEnd = useMemo(() => new Date(`${date}T23:59:59`).toISOString(), [date]);
  const { data, isLoading, isError, refetch } = useAvailability(resource.id, dayStart, dayEnd);
  const createMutation = useCreateReservation();
  const queryClient = useQueryClient();

  const slots = useMemo(() => {
    if (!data) return [];
    const day = new Date(`${date}T00:00:00`);
    return data.slots.filter((s) => {
      const sd = new Date(s.start);
      return (
        sd.getFullYear() === day.getFullYear() &&
        sd.getMonth() === day.getMonth() &&
        sd.getDate() === day.getDate() &&
        s.status !== 'closed'
      );
    });
  }, [data, date]);

  const canSubmit = slot && !createMutation.isPending;

  const submit = async () => {
    if (!slot) return;
    setError(null);
    try {
      await createMutation.mutateAsync({
        resourceId: resource.id,
        title: title.trim() || `${resource.name} — ${formatDate(slot.start)}`,
        purpose: motif.trim() || undefined,
        start: slot.start,
        end: slot.end,
        participants,
      });
      setDone(true);
      setSlot(null);
      setMotif('');
      setTitle('');
    } catch (e) {
      if (e instanceof ApiError && e.isConflict) {
        setError('Ce créneau vient d’être réservé. Choisissez un autre horaire.');
        void queryClient.invalidateQueries({ queryKey: ['availability'] });
        void refetch();
      } else {
        setError(e instanceof Error ? e.message : 'Réservation impossible.');
      }
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-lg font-semibold text-brand-800">Réservation confirmée ✓</p>
        <p className="mt-1 text-sm text-brand-700">
          Vous pouvez suivre ou annuler votre demande depuis « Mes réservations ».
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link to="/mes-reservations">
            <Button size="sm">Voir mes réservations</Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setDone(false);
              setDate(today);
            }}
          >
            Nouvelle réservation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Field label="Date" htmlFor="slot-date">
        <Input
          id="slot-date"
          type="date"
          min={today}
          value={date}
          onChange={(e) => {
            setDate(e.target.value || today);
            setSlot(null);
          }}
        />
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-700">
          Créneau {resource.type === 'room' ? '(1 heure)' : ''}
        </legend>
        {isLoading ? (
          <p className="text-sm text-gray-500">Chargement des disponibilités…</p>
        ) : isError ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-red-600">Impossible de charger les disponibilités.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun créneau ce jour-là.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((s) => {
              const busy = s.status !== 'free';
              const selected =
                slot && new Date(slot.start).getTime() === new Date(s.start).getTime();
              return (
                <button
                  key={s.start}
                  type="button"
                  disabled={busy}
                  aria-pressed={Boolean(selected)}
                  onClick={() => setSlot({ start: s.start, end: s.end })}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    busy && 'cursor-not-allowed border-line bg-gray-50 text-gray-400 line-through',
                    !busy &&
                      !selected &&
                      'border-line bg-white text-gray-800 hover:border-brand-400 hover:bg-brand-50',
                    selected && 'border-brand-600 bg-brand-600 text-white',
                  )}
                >
                  {formatTime(s.start)} - {formatTime(s.end)}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">Les créneaux barrés sont déjà réservés.</p>
      </fieldset>

      <Field
        label="Nombre de participants"
        htmlFor="slot-participants"
        hint={resource.room ? `Capacité : ${resource.room.capacity} places` : undefined}
      >
        <Input
          id="slot-participants"
          type="number"
          min={1}
          max={resource.room?.capacity}
          value={participants}
          onChange={(e) => setParticipants(Math.max(1, Number(e.target.value) || 1))}
        />
      </Field>

      <Field label="Titre" htmlFor="slot-title">
        <Input
          id="slot-title"
          placeholder={`Ex : ${resource.name} — ${formatDate(date)}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <Field label="Motif (facultatif)" htmlFor="slot-motif">
        <Textarea
          id="slot-motif"
          rows={2}
          placeholder="Précisez l'objet de la réservation…"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
        />
      </Field>

      {slot && (
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <p className="font-medium text-gray-900">Récapitulatif</p>
          <p className="mt-0.5 text-gray-600">
            {resource.name} · {formatDate(slot.start)} · {formatTime(slot.start)} -{' '}
            {formatTime(slot.end)}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={!canSubmit}
        loading={createMutation.isPending}
        onClick={submit}
      >
        Confirmer la réservation
      </Button>
      <p className="text-center text-xs text-gray-500">
        Vous pourrez modifier ou annuler depuis « Mes réservations ».
      </p>
    </div>
  );
}
