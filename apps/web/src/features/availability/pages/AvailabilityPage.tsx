import { Link, useParams } from 'react-router-dom';
import { useResource } from '@/features/resources/hooks';
import { SlotBookingForm } from '@/features/availability/components/SlotBookingForm';
import { ErrorState, Spinner } from '@/components/ui/Feedback';
import { Card } from '@/components/ui/Feedback';
import { ROOM_KIND_LABELS } from '@/lib/utils';

export function AvailabilityPage() {
  const { id } = useParams<{ id: string }>();
  const { data: resource, isLoading, isError, refetch } = useResource(id);

  if (isLoading) return <Spinner />;
  if (isError || !resource)
    return <ErrorState message="Ressource introuvable." onRetry={() => refetch()} />;

  const equipments = resource.room
    ? [
        resource.room.hasProjector && 'Vidéoprojecteur',
        resource.room.hasWhiteboard && 'Tableau blanc',
      ].filter((e): e is string => Boolean(e))
    : [];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/ressources"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        ← Retour à la recherche
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">Réserver cette salle</h1>

      <div className="mt-5 grid gap-6 lg:grid-cols-5">
        {/* Carte informations */}
        <Card className="h-fit p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{resource.name}</h2>
            <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white">
              Disponible
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Capacité</dt>
              <dd className="font-medium text-gray-900">
                {resource.room ? `${resource.room.capacity} places` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Lieu</dt>
              <dd className="font-medium text-gray-900">{resource.locationName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Type</dt>
              <dd className="font-medium text-gray-900">
                {resource.room ? ROOM_KIND_LABELS[resource.room.kind] : 'Équipement'}
              </dd>
            </div>
          </dl>

          {equipments.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Équipements
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {equipments.map((e) => (
                  <span
                    key={e}
                    className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 border-t border-line pt-3 text-xs text-gray-500">
            Les créneaux se mettent à jour en direct, sans recharger la page.
          </p>
        </Card>

        {/* Carte réservation */}
        <Card className="p-5 lg:col-span-3">
          <SlotBookingForm resource={resource} />
        </Card>
      </div>
    </div>
  );
}
