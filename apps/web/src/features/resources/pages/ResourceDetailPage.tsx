import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useResource, useCreateResource, useUpdateResource } from '../hooks';
import { ResourceForm } from '../components/ResourceForm';
import { LoanRequestForm } from '@/features/loans/components/LoanRequestForm';
import { CollaborationSection } from '@/features/collaboration/components/CollaborationSection';
import { Button } from '@/components/ui/Button';
import { Badge, Card, ErrorState, PageHeader, Spinner } from '@/components/ui/Feedback';
import {
  EQUIPMENT_KIND_LABELS,
  EQUIPMENT_STATE_LABELS,
  formatDate,
  RESOURCE_TYPE_LABELS,
  ROOM_KIND_LABELS,
} from '@/lib/utils';

export function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: resource, isLoading, isError, refetch } = useResource(id);
  const createResource = useCreateResource();
  const updateResource = useUpdateResource(id ?? '');
  const [editOpen, setEditOpen] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  if (isLoading) return <Spinner />;
  if (isError || !resource) {
    return <ErrorState message="Ressource introuvable." onRetry={() => refetch()} />;
  }

  const canBook = resource.type === 'room' && resource.isActive;
  const canBorrow = resource.type === 'equipment' && resource.equipment?.state === 'available';

  const save = async (values: Parameters<typeof createResource.mutateAsync>[0]) => {
    if (resource.id && id) {
      await updateResource.mutateAsync(values);
    } else {
      await createResource.mutateAsync(values);
    }
    setEditOpen(false);
  };

  const photos = resource.photos.length ? resource.photos : [null];
  const currentPhoto = photos[photoIdx] ?? photos[0];

  return (
    <div className="mx-auto max-w-5xl">
      <nav className="mb-4 text-sm text-gray-500" aria-label="Fil d'Ariane">
        <Link to="/ressources" className="hover:text-brand-600">
          Ressources
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-gray-900">{resource.name}</span>
      </nav>

      <PageHeader
        title={resource.name}
        description={resource.locationName}
        actions={
          <div className="flex flex-wrap gap-2">
            {canBook && (
              <Link to={`/ressources/${resource.id}/disponibilite`}>
                <Button>Réserver</Button>
              </Link>
            )}
            {canBorrow && (
              <Button variant="success" onClick={() => setLoanOpen(true)}>
                Emprunter
              </Button>
            )}
            {isManager && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Modifier
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="aspect-[16/9] bg-gray-100">
            {currentPhoto ? (
              <img src={currentPhoto} alt={resource.name} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full items-center justify-center text-6xl text-gray-300"
                aria-hidden="true"
              >
                {resource.type === 'room' ? '🚪' : '🔧'}
              </div>
            )}
          </div>
          {resource.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {resource.photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIdx(i)}
                  aria-label={`Photo ${i + 1}`}
                  aria-pressed={photoIdx === i}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 ${photoIdx === i ? 'border-brand-600' : 'border-transparent'}`}
                >
                  <img src={p} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 font-semibold text-gray-900">Informations</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Type</dt>
                <dd>
                  <Badge tone={resource.type === 'room' ? 'blue' : 'purple'}>
                    {RESOURCE_TYPE_LABELS[resource.type]}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Lieu</dt>
                <dd className="text-right text-gray-900">{resource.locationName}</dd>
              </div>
              {resource.room && (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Capacité</dt>
                    <dd className="text-gray-900">{resource.room.capacity} places</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Type de salle</dt>
                    <dd className="text-gray-900">{ROOM_KIND_LABELS[resource.room.kind]}</dd>
                  </div>
                  {resource.room.surfaceM2 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">Surface</dt>
                      <dd className="text-gray-900">{resource.room.surfaceM2} m²</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Équipements</dt>
                    <dd className="text-right text-gray-900">
                      {[
                        resource.room.hasProjector && 'Vidéoprojecteur',
                        resource.room.hasWhiteboard && 'Tableau blanc',
                      ]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </dd>
                  </div>
                </>
              )}
              {resource.equipment && (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">N° inventaire</dt>
                    <dd className="font-mono text-gray-900">
                      {resource.equipment.inventoryNumber}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Type</dt>
                    <dd className="text-gray-900">
                      {EQUIPMENT_KIND_LABELS[resource.equipment.kind]}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">État</dt>
                    <dd>
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
                    </dd>
                  </div>
                </>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Statut</dt>
                <dd>
                  <Badge tone={resource.isActive ? 'green' : 'gray'}>
                    {resource.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Ajoutée le</dt>
                <dd className="text-gray-900">{formatDate(resource.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          {resource.rules.notes && (
            <Card className="p-4">
              <h2 className="mb-2 font-semibold text-gray-900">Règles d'utilisation</h2>
              <ul className="space-y-1 text-sm text-gray-600">
                {resource.rules.maxDurationHours && (
                  <li>⏱ Durée max : {resource.rules.maxDurationHours} h</li>
                )}
                {resource.rules.minNoticeHours != null && resource.rules.minNoticeHours > 0 && (
                  <li>📢 Préavis : {resource.rules.minNoticeHours} h</li>
                )}
                {resource.rules.requiresApproval && <li>✅ Validation requise</li>}
                {resource.rules.notes && <li>📝 {resource.rules.notes}</li>}
              </ul>
            </Card>
          )}

          {resource.tags.length > 0 && (
            <Card className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {resource.tags.map((t) => (
                  <Badge key={t} tone="gray">
                    #{t}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <CollaborationSection resourceId={resource.id} />

      <ResourceForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={resource}
        loading={updateResource.isPending}
        onSubmit={save}
      />
      <LoanRequestForm
        open={loanOpen}
        onClose={() => setLoanOpen(false)}
        resourceId={resource.id}
        resourceName={resource.name}
      />
    </div>
  );
}
