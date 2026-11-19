import { useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import type { Reservation } from '@plateforme/shared';
import { useReservations } from '@/features/reservations/hooks';
import { Spinner, ErrorState } from '@/components/ui/Feedback';
import { RESERVATION_STATUS_LABELS } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  cancelled: '#9ca3af',
};

export function ReservationCalendar({
  resourceId,
  onSelectSlot,
  onSelectEvent,
  height = '70vh',
}: {
  resourceId: string;
  onSelectSlot: (start: string, end: string) => void;
  onSelectEvent?: (reservation: Reservation) => void;
  height?: string;
}) {
  const calendarRef = useRef<FullCalendar>(null);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const { data, isLoading, isError, refetch } = useReservations({
    resourceId,
    from: range?.from,
    to: range?.to,
  });

  const events = useMemo<EventInput[]>(
    () =>
      (data?.items ?? [])
        .filter((r) => r.status !== 'cancelled')
        .map((r) => ({
          id: r.id,
          title: `${r.title} (${RESERVATION_STATUS_LABELS[r.status]})`,
          start: r.start,
          end: r.end,
          backgroundColor: STATUS_COLORS[r.status] ?? '#6b7280',
          borderColor: STATUS_COLORS[r.status] ?? '#6b7280',
          extendedProps: { reservation: r },
        })),
    [data],
  );

  if (isLoading) return <Spinner label="Chargement du calendrier…" />;
  if (isError)
    return <ErrorState message="Impossible de charger le calendrier." onRetry={() => refetch()} />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-600" aria-hidden="true">
        {Object.entries(RESERVATION_STATUS_LABELS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS[k] }} />
            {v}
          </span>
        ))}
      </div>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        locale="fr"
        height={height}
        selectable
        selectMirror
        events={events}
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        select={(arg: DateSelectArg) => {
          onSelectSlot(arg.start.toISOString(), arg.end.toISOString());
          arg.view.calendar.unselect();
        }}
        eventClick={(arg: EventClickArg) => {
          const r = arg.event.extendedProps.reservation as Reservation | undefined;
          if (r) onSelectEvent?.(r);
        }}
        datesSet={(arg) => {
          setRange({ from: arg.startStr, to: arg.endStr });
        }}
        buttonText={{
          today: "Aujourd'hui",
          month: 'Mois',
          week: 'Semaine',
          day: 'Jour',
          list: 'Liste',
        }}
        allDayText="Toute la journée"
        noEventsText="Aucune réservation sur cette période"
      />
    </div>
  );
}
