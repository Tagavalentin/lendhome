import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EquipmentState, Resource, ResourceFilters, ResourceType } from '@plateforme/shared';
import { useResources, useCreateResource } from '../hooks';
import { useLocations } from '@/features/locations/api';
import { ResourceCardView, ResourceListItem } from '../components/ResourceCard';
import { ResourceForm } from '../components/ResourceForm';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback';
import { EQUIPMENT_STATE_LABELS } from '@/lib/utils';
import { cn } from '@/lib/utils';

const TYPE_TABS: { value: '' | ResourceType; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'room', label: 'Salles' },
  { value: 'equipment', label: 'Matériel' },
];

export function ResourceListPage() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [formOpen, setFormOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const createResource = useCreateResource();

  const filters: ResourceFilters = useMemo(
    () => ({
      q: params.get('q') ?? undefined,
      type: (params.get('type') as ResourceType) || undefined,
      locationId: params.get('locationId') || undefined,
      minCapacity: params.get('minCapacity') ? Number(params.get('minCapacity')) : undefined,
      state: (params.get('state') as EquipmentState) || undefined,
      page: Number(params.get('page') ?? 1),
      pageSize: 12,
      sort: (params.get('sort') as ResourceFilters['sort']) || undefined,
      order: (params.get('order') as 'asc' | 'desc') || undefined,
      availableNow: params.get('availableNow') === '1' || undefined,
    }),
    [params],
  );

  const { data, isLoading, isError, refetch } = useResources(filters);
  const { data: locations } = useLocations();

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', search || null);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const typeFilter = params.get('type') ?? '';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salles et ressources</h1>
          <p className="mt-1 text-sm text-gray-500">
            Trouvez un espace ou un équipement disponible.
          </p>
        </div>
        {isManager && <Button onClick={() => setFormOpen(true)}>Ajouter une ressource</Button>}
      </div>

      {/* Onglets type + filtre disponibilité */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div
          className="flex gap-1 border-b border-line"
          role="tablist"
          aria-label="Type de ressource"
        >
          {TYPE_TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={typeFilter === t.value}
              onClick={() => updateParam('type', t.value || null)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                typeFilter === t.value
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={filters.availableNow === true}
          onClick={() => updateParam('availableNow', params.get('availableNow') ? null : '1')}
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
            filters.availableNow
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-line bg-white text-gray-600 hover:border-brand-400 hover:text-brand-700',
          )}
        >
          Disponible maintenant
        </button>
      </div>

      {/* Filtres */}
      <form
        onSubmit={submitSearch}
        className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
        role="search"
      >
        <div className="lg:col-span-2">
          <Field label="Rechercher" htmlFor="q">
            <Input
              id="q"
              placeholder="Nom, description, mot-clé…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Bâtiment" htmlFor="locationId">
          <Select
            id="locationId"
            value={params.get('locationId') ?? ''}
            onChange={(e) => updateParam('locationId', e.target.value || null)}
          >
            <option value="">Tous</option>
            {(locations?.items ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Capacité" htmlFor="minCapacity">
          <Input
            id="minCapacity"
            type="number"
            min={1}
            placeholder="Min. places"
            value={params.get('minCapacity') ?? ''}
            onChange={(e) => updateParam('minCapacity', e.target.value || null)}
          />
        </Field>
        <Field label="État" htmlFor="state">
          <Select
            id="state"
            value={params.get('state') ?? ''}
            onChange={(e) => updateParam('state', e.target.value || null)}
          >
            <option value="">Tous</option>
            {Object.entries(EQUIPMENT_STATE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
          <Button type="submit" size="sm">
            Rechercher
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setParams({}, { replace: true });
            }}
          >
            Réinitialiser
          </Button>
          <span className="ml-auto text-sm text-gray-500" aria-live="polite">
            {data ? `${data.total} résultat${data.total > 1 ? 's' : ''}` : ''}
          </span>
          <div
            className="flex rounded-lg border border-line"
            role="group"
            aria-label="Mode d'affichage"
          >
            {(['grid', 'list'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn(
                  'px-3 py-1.5 text-sm',
                  v === 'grid' ? 'rounded-l-lg' : 'rounded-r-lg',
                  view === v ? 'bg-brand-600 text-white' : 'bg-white text-gray-600',
                )}
              >
                {v === 'grid' ? '▦ Grille' : '☰ Liste'}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Résultats */}
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState message="Impossible de charger les ressources." onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Aucune ressource trouvée"
          message="Essayez d'élargir vos critères de recherche."
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((r) => (
            <ResourceCardView key={r.id} resource={r} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((r) => (
            <ResourceListItem key={r.id} resource={r} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
          <Button
            variant="secondary"
            size="sm"
            disabled={filters.page! <= 1}
            onClick={() => updateParam('page', String(filters.page! - 1))}
          >
            ← Précédent
          </Button>
          <span className="text-sm text-gray-600">
            Page {filters.page} / {totalPages} — {data.total} résultat{data.total > 1 ? 's' : ''}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={filters.page! >= totalPages}
            onClick={() => updateParam('page', String(filters.page! + 1))}
          >
            Suivant →
          </Button>
        </nav>
      )}

      {isManager && (
        <ResourceForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          loading={createResource.isPending}
          onSubmit={async (values) => {
            await createResource.mutateAsync(values as Partial<Resource>);
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}
