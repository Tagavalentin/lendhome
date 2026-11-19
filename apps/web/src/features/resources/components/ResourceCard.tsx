import { Link } from 'react-router-dom';
import type { Resource } from '@plateforme/shared';
import { Badge, Card } from '@/components/ui/Feedback';
import {
  EQUIPMENT_KIND_LABELS,
  EQUIPMENT_STATE_LABELS,
  RESOURCE_TYPE_LABELS,
  ROOM_KIND_LABELS,
} from '@/lib/utils';

export function ResourceCardView({ resource }: { resource: Resource }) {
  return (
    <Link to={`/ressources/${resource.id}`} className="group block">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="aspect-[16/9] overflow-hidden bg-gray-100">
          {resource.photos[0] ? (
            <img
              src={resource.photos[0]}
              alt={resource.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full items-center justify-center text-4xl text-gray-300"
              aria-hidden="true"
            >
              {resource.type === 'room' ? '🚪' : '🔧'}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-700">
              {resource.name}
            </h3>
            <Badge tone={resource.type === 'room' ? 'blue' : 'purple'}>
              {RESOURCE_TYPE_LABELS[resource.type]}
            </Badge>
          </div>
          <p className="line-clamp-2 text-sm text-gray-500">{resource.description}</p>
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-xs text-gray-500">
            {resource.locationName && <span>📍 {resource.locationName}</span>}
            {resource.room && <span>👥 {resource.room.capacity} places</span>}
            {resource.equipment && (
              <>
                <span>🔢 {resource.equipment.inventoryNumber}</span>
                <Badge
                  tone={
                    resource.equipment.state === 'available'
                      ? 'green'
                      : resource.equipment.state === 'in_use'
                        ? 'amber'
                        : 'red'
                  }
                >
                  {EQUIPMENT_STATE_LABELS[resource.equipment.state]}
                </Badge>
              </>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function ResourceListItem({ resource }: { resource: Resource }) {
  return (
    <Link to={`/ressources/${resource.id}`} className="group block">
      <Card className="flex items-center gap-4 p-4 transition-shadow group-hover:shadow-md">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-gray-100">
          {resource.photos[0] ? (
            <img
              src={resource.photos[0]}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full items-center justify-center text-2xl text-gray-300"
              aria-hidden="true"
            >
              {resource.type === 'room' ? '🚪' : '🔧'}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-700">
              {resource.name}
            </h3>
            <Badge tone={resource.type === 'room' ? 'blue' : 'purple'}>
              {RESOURCE_TYPE_LABELS[resource.type]}
            </Badge>
            {resource.room && <Badge tone="gray">{ROOM_KIND_LABELS[resource.room.kind]}</Badge>}
            {resource.equipment && (
              <Badge tone="gray">{EQUIPMENT_KIND_LABELS[resource.equipment.kind]}</Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-gray-500">{resource.description}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-500">
            {resource.locationName && <span>📍 {resource.locationName}</span>}
            {resource.room && <span>👥 {resource.room.capacity} places</span>}
            {resource.equipment && <span>🔢 {resource.equipment.inventoryNumber}</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
