import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useResource } from '@/features/resources/hooks';
import { ReservationCalendar } from '@/features/availability/components/ReservationCalendar';
import { ReservationForm } from '@/features/reservations/components/ReservationForm';
import { useAuthStore } from '@/stores/auth';
import { ErrorState, PageHeader, Spinner } from '@/components/ui/Feedback';
import type { Reservation } from '@plateforme/shared';

export function AvailabilityPage() {
  const { id } = useParams<{ id: string }>();
  const { data: resource, isLoading, isError } = useResource(id);
  const user = useAuthStore((s) => s.user);
  const [slot, setSlot] = useState<{ start: string; end: string } | null>(null);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  if (isLoading) return <Spinner />;
  if (isError || !resource) return <ErrorState message="Ressource introuvable." />;

  const canManage = user?.role === 'manager' || user?.role === 'admin';

  const openCreate = (start: string, end: string) => {
    setSlot({ start, end });
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <nav className="mb-4 text-sm text-gray-500" aria-label="Fil d'Ariane">
        <Link to="/ressources" className="hover:text-brand-600">
          Ressources
        </Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/ressources/${resource.id}`} className="hover:text-brand-600">
          {resource.name}
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-gray-900">Disponibilités</span>
      </nav>

      <PageHeader
        title={`Disponibilités — ${resource.name}`}
        description="Cliquez ou faites glisser sur le calendrier pour sélectionner un créneau."
      />

      <ReservationCalendar
        resourceId={resource.id}
        onSelectSlot={openCreate}
        onSelectEvent={(r) => {
          if (canManage || r.userId === user?.id) {
            setEditing(r);
            setFormOpen(true);
          }
        }}
      />

      <ReservationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        resourceId={resource.id}
        resourceName={resource.name}
        maxCapacity={resource.room?.capacity}
        initialStart={slot?.start}
        initialEnd={slot?.end}
        existing={editing}
      />
    </div>
  );
}
