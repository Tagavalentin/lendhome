import { api } from '@/lib/api';
import type { AvailabilityResponse, AvailabilitySlot } from '@plateforme/shared';

interface BackendDayAvailability {
  date?: string;
  openTime?: string;
  closeTime?: string;
  bookedSlots?: { start: string; end: string }[];
  message?: string;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Le backend expose une disponibilité par date (`?date=YYYY-MM-DD`) et
 * renvoie horaires d'ouverture + créneaux déjà réservés.
 * On synthétise les créneaux horaires attendus par le frontend.
 */
export async function fetchAvailability(
  resourceId: string,
  from: string,
  _to: string,
): Promise<AvailabilityResponse> {
  const date = from.slice(0, 10);
  const day = await api.get<BackendDayAvailability>(`/api/resources/${resourceId}/availability`, {
    date,
  });

  const slots: AvailabilitySlot[] = [];
  if (day.openTime && day.closeTime) {
    const base = new Date(`${date}T00:00:00`);
    const openMin = toMinutes(day.openTime);
    const closeMin = toMinutes(day.closeTime);
    const booked = (day.bookedSlots ?? []).map((b) => ({
      start: new Date(b.start).getTime(),
      end: new Date(b.end).getTime(),
    }));

    for (let m = openMin; m < closeMin; m += 60) {
      const s = new Date(base);
      s.setHours(0, m, 0, 0);
      const e = new Date(base);
      e.setHours(0, Math.min(m + 60, closeMin), 0, 0);
      const busy = booked.some((b) => overlaps(s.getTime(), e.getTime(), b.start, b.end));
      slots.push({
        start: s.toISOString(),
        end: e.toISOString(),
        status: busy ? 'busy' : 'free',
        ...(busy ? { reason: 'Réservation existante' } : {}),
      });
    }
  }

  return { resourceId, from, to: _to, slots };
}
