import { useMemo, useState } from 'react';
import { useReservations } from '@/features/reservations/hooks';
import { useResources } from '@/features/resources/hooks';
import type { ResourceFilters } from '@plateforme/shared';
import { Card, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback';
import { cn, formatTime } from '@/lib/utils';
import type { Reservation } from '@plateforme/shared';

type Mode = 'jour' | 'semaine' | 'mois';

const DAY_MS = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

function mondayOf(d: Date): Date {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 6) % 7));
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

const frDay = (d: Date, opts?: Intl.DateTimeFormatOptions) =>
  d.toLocaleDateString('fr-FR', opts ?? { weekday: 'short' });

const frLong = (d: Date, opts?: Intl.DateTimeFormatOptions) =>
  d.toLocaleDateString('fr-FR', opts ?? { day: 'numeric', month: 'long' });

/** Réservations visibles : on masque les annulées et refusées. */
function visible(r: Reservation) {
  return r.status !== 'cancelled' && r.status !== 'rejected';
}

function overlapsDay(r: Reservation, dayStart: Date): boolean {
  const end = new Date(dayStart.getTime() + DAY_MS);
  return new Date(r.start) < end && new Date(r.end) > dayStart;
}

const STATUS_STYLE: Record<string, string> = {
  approved: 'bg-brand-600 text-white',
  pending: 'bg-amber-400 text-amber-950',
};

export function CalendarPage() {
  const [mode, setMode] = useState<Mode>('semaine');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));

  const reservations = useReservations({});
  const resources = useResources({ type: 'room', pageSize: 100 } as ResourceFilters);

  const events = useMemo(
    () => (reservations.data?.items ?? []).filter(visible),
    [reservations.data],
  );
  const rooms = useMemo(
    () => (resources.data?.items ?? []).filter((r) => r.type === 'room'),
    [resources.data],
  );

  // Jours affichés selon le mode
  const days = useMemo<Date[]>(() => {
    if (mode === 'jour') return [startOfDay(anchor)];
    if (mode === 'semaine') {
      const mon = mondayOf(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    }
    // mois : cellules du calendrier (semaines complètes)
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [mode, anchor]);

  const shift = (dir: 1 | -1) => {
    if (mode === 'jour') setAnchor((a) => addDays(a, dir));
    else if (mode === 'semaine') setAnchor((a) => addDays(a, dir * 7));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));
  };

  const goToday = () => setAnchor(startOfDay(new Date()));

  const subtitle =
    mode === 'mois'
      ? anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : mode === 'jour'
        ? frLong(anchor, { weekday: 'long', day: 'numeric', month: 'long' })
        : `Semaine du ${frLong(days[0])} au ${frLong(days[6])}`;

  const eventsFor = (resourceId: string, day: Date) =>
    events
      .filter((r) => r.resourceId === resourceId && overlapsDay(r, startOfDay(day)))
      .sort((a, b) => a.start.localeCompare(b.start));

  const countForDay = (day: Date) => events.filter((r) => overlapsDay(r, startOfDay(day))).length;

  const isLoading = reservations.isLoading || resources.isLoading;
  const isError = reservations.isError || resources.isError;

  return (
    <div>
      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
            <p className="mt-1 text-sm text-gray-500 capitalize">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shift(-1)}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                aria-label="Période précédente"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goToday}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={() => shift(1)}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                aria-label="Période suivante"
              >
                ›
              </button>
            </div>
            <div
              className="flex rounded-lg border border-line p-0.5"
              role="group"
              aria-label="Vue du calendrier"
            >
              {(
                [
                  ['jour', 'Jour'],
                  ['semaine', 'Semaine'],
                  ['mois', 'Mois'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    mode === m ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message="Impossible de charger le calendrier."
          onRetry={() => {
            reservations.refetch();
            resources.refetch();
          }}
        />
      ) : rooms.length === 0 ? (
        <EmptyState
          title="Aucune salle"
          message="Aucune salle n'est disponible pour alimenter le calendrier."
        />
      ) : mode === 'mois' ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line bg-gray-50 text-center text-xs font-semibold text-gray-500">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <div key={d} className="px-2 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const inMonth = day.getMonth() === anchor.getMonth();
              const count = countForDay(day);
              const isToday = dayKey(day) === dayKey(new Date());
              return (
                <button
                  key={dayKey(day)}
                  type="button"
                  onClick={() => {
                    setAnchor(day);
                    setMode('jour');
                  }}
                  className={cn(
                    'flex min-h-[72px] flex-col items-start gap-1 border-b border-r border-line p-2 text-left transition-colors hover:bg-brand-50',
                    !inMonth && 'bg-gray-50/60 text-gray-400',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                      isToday ? 'bg-brand-600 text-white' : '',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {count > 0 && (
                    <span className="text-[11px] font-medium text-brand-700">
                      {count} réservation{count > 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Salle
                </th>
                {days.map((day) => {
                  const isToday = dayKey(day) === dayKey(new Date());
                  return (
                    <th
                      key={dayKey(day)}
                      className={cn(
                        'px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide',
                        isToday ? 'text-brand-700' : 'text-gray-500',
                      )}
                    >
                      <div>{frDay(day)}</div>
                      <div className={cn('text-base font-bold', isToday && 'text-brand-700')}>
                        {day.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-b border-line last:border-0">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3">
                    <p className="font-semibold text-gray-900">{room.name}</p>
                    <p className="text-xs text-gray-500">
                      {room.room?.capacity ?? '—'} places
                      {room.locationName ? ` · ${room.locationName}` : ''}
                    </p>
                  </td>
                  {days.map((day) => {
                    const list = eventsFor(room.id, day);
                    return (
                      <td key={dayKey(day)} className="align-top px-2 py-2">
                        <div className="space-y-1.5">
                          {list.length === 0 && (
                            <span className="block py-3 text-center text-xs text-gray-300">
                              Libre
                            </span>
                          )}
                          {list.map((r) => (
                            <div
                              key={r.id}
                              className={cn(
                                'rounded-md px-2 py-1.5 text-[11px] font-medium leading-tight',
                                STATUS_STYLE[r.status] ?? 'bg-gray-200 text-gray-700',
                              )}
                              title={`${formatTime(r.start)} – ${formatTime(r.end)} · ${r.title}`}
                            >
                              <span className="block">{formatTime(r.start)}</span>
                              <span className="block truncate">{r.title || r.resourceName}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
