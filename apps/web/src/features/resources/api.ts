import { api, API_BASE_URL } from '@/lib/api';
import type { Paginated, Resource, ResourceFilters } from '@plateforme/shared';
import { toFrontendResource } from '@/lib/backend';
import type { BackendLocation, BackendResource } from '@/lib/backend';

interface UploadedFileMeta {
  storagePath?: string;
  path?: string;
  url?: string;
}

/** Upload une data-URL via POST /api/files/upload et renvoie le chemin /uploads/... */
async function uploadPhoto(photo: string): Promise<string> {
  const blob = await (await fetch(photo)).blob();
  const ext = blob.type.split('/')[1]?.split('+')[0] ?? 'jpg';
  const form = new FormData();
  form.append('file', blob, `photo.${ext}`);
  const meta = await api.upload<UploadedFileMeta>('/api/files/upload', form);
  const stored = meta.storagePath ?? meta.path ?? meta.url ?? '';
  const base = stored.split(/[\\/]/).pop() ?? stored;
  return `/uploads/${base}`;
}

/**
 * Normalise les photos avant envoi :
 * - data URL → uploadée sur le backend
 * - URL absolue du backend → ramenée à son chemin /uploads/...
 * - chemin /uploads/... → inchangé
 */
async function resolvePhotos(photos?: string[]): Promise<string[] | undefined> {
  if (!photos?.length) return photos;
  const out: string[] = [];
  for (const p of photos) {
    if (p.startsWith('data:')) out.push(await uploadPhoto(p));
    else if (p.startsWith(API_BASE_URL)) out.push(new URL(p).pathname);
    else out.push(p);
  }
  return out;
}

async function locationNames(): Promise<Map<string, string>> {
  try {
    const locs = await api.get<BackendLocation[]>('/api/locations');
    return new Map(locs.map((l) => [String(l._id ?? l.id), l.name]));
  } catch {
    return new Map();
  }
}

export async function fetchResources(
  filters: ResourceFilters,
  signal?: AbortSignal,
): Promise<Paginated<Resource>> {
  const names = await locationNames();
  const query: Record<string, string | number | undefined> = {
    locationId: filters.locationId || undefined,
    minCapacity: filters.minCapacity || undefined,
  };
  if (filters.type === 'room') query.type = 'Room';
  if (filters.type === 'equipment') query.type = 'Equipment';
  if (filters.state === 'available') query.state = 'available';
  if (filters.state === 'maintenance' || filters.state === 'retired') query.state = 'maintenance';

  const raw = await api.get<BackendResource[]>('/api/resources', query, signal);
  let items = raw.map((r) => toFrontendResource(r, names));

  // « Disponible maintenant » : filtré côté client (salles actives, matériel disponible)
  if (filters.availableNow) {
    items = items.filter(
      (r) => r.isActive && (r.type === 'room' || r.equipment?.state === 'available'),
    );
  }

  // Filtres non supportés par le backend : recherche texte, tri, pagination.
  if (filters.q) {
    const q = filters.q.toLowerCase();
    items = items.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.equipment?.inventoryNumber.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }
  if (filters.sort) {
    const dir = filters.order === 'desc' ? -1 : 1;
    items = [...items].sort((a, b) => {
      if (filters.sort === 'name') return a.name.localeCompare(b.name) * dir;
      if (filters.sort === 'capacity')
        return ((a.room?.capacity ?? 0) - (b.room?.capacity ?? 0)) * dir;
      return a.createdAt.localeCompare(b.createdAt) * dir;
    });
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

export async function fetchResource(id: string): Promise<Resource> {
  const names = await locationNames();
  const r = await api.get<BackendResource>(`/api/resources/${id}`);
  return toFrontendResource(r, names);
}

export async function createResource(input: Partial<Resource>): Promise<Resource> {
  const base = {
    name: input.name ?? '',
    description: input.description,
    locationId: input.locationId || undefined,
    photos: await resolvePhotos(input.photos),
  };
  const created =
    input.type === 'equipment'
      ? await api.post<BackendResource>('/api/resources/equipments', {
          ...base,
          inventoryNumber: input.equipment?.inventoryNumber ?? '',
          state:
            input.equipment?.state === 'available'
              ? 'available'
              : input.equipment?.state === 'in_use'
                ? 'available'
                : 'maintenance',
        })
      : await api.post<BackendResource>('/api/resources/rooms', {
          ...base,
          capacity: input.room?.capacity ?? 1,
        });
  return toFrontendResource(created, await locationNames());
}

export async function updateResource(id: string, input: Partial<Resource>): Promise<Resource> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.description !== undefined) body.description = input.description;
  if (input.locationId !== undefined) body.locationId = input.locationId || undefined;
  if (input.isActive !== undefined) body.isActive = input.isActive;
  if (input.photos !== undefined) body.photos = await resolvePhotos(input.photos);
  if (input.room?.capacity !== undefined) body.capacity = input.room.capacity;
  if (input.equipment?.inventoryNumber !== undefined)
    body.inventoryNumber = input.equipment.inventoryNumber;
  if (input.equipment?.state !== undefined)
    body.state =
      input.equipment.state === 'available' || input.equipment.state === 'in_use'
        ? 'available'
        : 'maintenance';

  const updated = await api.patch<BackendResource>(`/api/resources/${id}`, body);
  return toFrontendResource(updated, await locationNames());
}
