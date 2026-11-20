import { Link } from 'react-router-dom';
import type { Resource } from '@plateforme/shared';
import { Badge, Card } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { EQUIPMENT_KIND_LABELS, EQUIPMENT_STATE_LABELS, ROOM_KIND_LABELS } from '@/lib/utils';

function Thumb({ resource }: { resource: Resource }) {
  if (resource.photos[0]) {
    return (
      <img
        src={resource.photos[0]}
        alt={resource.name}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div
      className="flex h-full items-center justify-center bg-brand-50 text-3xl text-brand-300"
      aria-hidden="true"
    >
      {resource.type === 'room' ? '🚪' : '🔧'}
    </div>
  );
}

function Meta({ resource }: { resource: Resource }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
      {resource.locationName && <span>{resource.locationName}</span>}
      {resource.room && <span>{resource.room.capacity} places</span>}
      {resource.equipment && <span>{resource.equipment.inventoryNumber}</span>}
    </div>
  );
}

export function ResourceCardView({ resource }: { resource: Resource }) {
  const available =
    resource.type === 'room' ? resource.isActive : resource.equipment?.state === 'available';

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link
        to={`/ressources/${resource.id}`}
        className="group relative block aspect-[16/9] overflow-hidden bg-brand-50"
        aria-label={`Voir ${resource.name}`}
      >
        <Thumb resource={resource} />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            available ? 'bg-brand-600 text-white' : 'bg-gray-500 text-white'
          }`}
        >
          {available ? 'Disponible' : 'Indisponible'}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-700">
            <Link to={`/ressources/${resource.id}`} className="hover:text-brand-700">
              {resource.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-gray-500">
            {resource.room
              ? `${resource.room.capacity} places · ${ROOM_KIND_LABELS[resource.room.kind]}`
              : `${EQUIPMENT_KIND_LABELS[resource.equipment?.kind ?? 'other']} · ${EQUIPMENT_STATE_LABELS[resource.equipment?.state ?? 'available']}`}
          </p>
        </div>
        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {resource.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto pt-2">
          <Link to={`/ressources/${resource.id}`} className="block">
            <Button variant="secondary" className="w-full" size="sm">
              {resource.type === 'room' ? 'Voir et réserver' : 'Voir et emprunter'}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function ResourceListItem({ resource }: { resource: Resource }) {
  return (
    <Link to={`/ressources/${resource.id}`} className="group block">
      <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-50">
          <Thumb resource={resource} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-700">
              {resource.name}
            </h3>
            <Badge tone={resource.type === 'room' ? 'teal' : 'teal'}>
              {resource.type === 'room' ? 'Salle' : 'Matériel'}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-gray-500">{resource.description}</p>
          <div className="mt-1">
            <Meta resource={resource} />
          </div>
        </div>
        <span className="hidden text-sm font-medium text-brand-600 sm:block">
          Voir et {resource.type === 'room' ? 'réserver' : 'emprunter'} →
        </span>
      </Card>
    </Link>
  );
}
