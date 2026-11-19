import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EquipmentState, ResourceFilters, ResourceType } from '@plateforme/shared';
import { useResources } from '../hooks';
import { useLocations } from '@/features/locations/api';
import { ResourceCardView, ResourceListItem } from '../components/ResourceCard';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { EmptyState, ErrorState, PageHeader, Spinner } from '@/components/ui/Feedback';
import { EQUIPMENT_STATE_LABELS } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function ResourceListPage() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState(params.get('q') ?? '');

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

  return (
    <div>
      <PageHeader
        title="Ressources"
        description="Salles et équipements disponibles à la réservation ou au prêt."
      />

      {/* Filtres */}
      <form
        onSubmit={submitSearch}
        className="mb-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
        role="search"
      >
        <div className="lg:col-span-2">
          <Field label="Recherche" htmlFor="q">
            <Input
              id="q"
              placeholder="Nom, description, mot-clé…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Type" htmlFor="type">
          <Select
            id="type"
            value={params.get('type') ?? ''}
            onChange={(e) => updateParam('type', e.target.value || null)}
          >
            <option value="">Tous</option>
            <option value="room">Salles</option>
            <option value="equipment">Équipements</option>
          </Select>
        </Field>
        <Field label="Lieu" htmlFor="locationId">
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
        <Field label="Capacité min." htmlFor="minCapacity">
          <Input
            id="minCapacity"
            type="number"
            min={1}
            placeholder="—"
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
        <div className="flex items-end gap-2 lg:col-span-6">
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
          <div
            className="ml-auto flex rounded-md border border-gray-200"
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
                  v === 'grid' ? 'rounded-l-md' : 'rounded-r-md',
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
    </div>
  );
}
