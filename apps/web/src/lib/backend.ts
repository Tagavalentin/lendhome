// Adaptateurs backend NestJS → types frontend @plateforme/shared.
// Le backend expose des rôles français et des modèles plus simples :
// ces fonctions normalisent les réponses de l'API réelle.

import type {
  Location,
  Notification,
  Resource,
  Reservation,
  User,
  UserRole,
} from '@plateforme/shared';
import { API_BASE_URL } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

// ---------- Rôles ----------

const ROLE_TO_FRONT: Record<string, UserRole> = {
  Utilisateur: 'user',
  Responsable: 'manager',
  Administrateur: 'admin',
};

const ROLE_TO_BACK: Record<UserRole, string> = {
  user: 'Utilisateur',
  manager: 'Responsable',
  admin: 'Administrateur',
};

export function toFrontendRole(role: string | undefined): UserRole {
  return ROLE_TO_FRONT[role ?? ''] ?? 'user';
}

export function toBackendRole(role: UserRole): string {
  return ROLE_TO_BACK[role];
}

// ---------- Utilisateur ----------

export interface BackendUser {
  id?: string;
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive?: boolean;
  phone?: string;
  organization?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function toFrontendUser(u: BackendUser): User {
  return {
    id: String(u.id ?? u._id),
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: toFrontendRole(u.role),
    createdAt: u.createdAt ?? new Date().toISOString(),
  };
}

// ---------- Login ----------

export interface BackendLoginResponse {
  accessToken: string;
  tokenType?: string;
  user: BackendUser;
}

/** Décode le `exp` d'un JWT pour stocker l'expiration du token. */
function jwtExpiry(token: string): string | undefined {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number };
    return payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeLoginResponse(res: BackendLoginResponse) {
  return {
    user: toFrontendUser(res.user),
    tokens: {
      accessToken: res.accessToken,
      expiresAt: jwtExpiry(res.accessToken),
    },
  };
}

// ---------- Ressources ----------

export interface BackendResource {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  type?: string; // 'Room' | 'Equipment'
  locationId?: string | { _id?: string; toString?: () => string } | null;
  locationName?: string;
  capacity?: number;
  inventoryNumber?: string;
  state?: string;
  isActive?: boolean;
  photos?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Transforme un chemin backend (/uploads/...) en URL absolue affichable. */
export function toPhotoUrl(p: string): string {
  if (p.startsWith('data:') || /^https?:\/\//.test(p)) return p;
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${API_BASE_URL}${path}`;
}

function mapEquipmentState(state?: string) {
  if (state === 'available') return 'available' as const;
  if (state === 'in_use') return 'in_use' as const;
  return 'maintenance' as const;
}

export function toFrontendResource(
  r: BackendResource,
  locationNames?: Map<string, string>,
): Resource {
  const type = r.type === 'Equipment' ? 'equipment' : 'room';
  const locationId = String(
    typeof r.locationId === 'object' && r.locationId !== null
      ? (r.locationId._id ?? r.locationId.toString?.() ?? '')
      : (r.locationId ?? ''),
  );
  return {
    id: String(r._id ?? r.id),
    type,
    name: r.name,
    description: r.description ?? '',
    locationId,
    locationName: r.locationName ?? (locationId ? locationNames?.get(locationId) : undefined),
    photos: (r.photos ?? []).map(toPhotoUrl),
    tags: [],
    room:
      type === 'room' && r.capacity != null ? { capacity: r.capacity, kind: 'meeting' } : undefined,
    equipment:
      type === 'equipment' && r.inventoryNumber
        ? {
            inventoryNumber: r.inventoryNumber,
            kind: 'other',
            state: mapEquipmentState(r.state),
          }
        : undefined,
    rules: {},
    isActive: r.isActive ?? true,
    createdAt: r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? new Date().toISOString(),
  };
}

// ---------- Réservations ----------

const RES_STATUS_MAP: Record<string, Reservation['status']> = {
  PENDING: 'pending',
  CONFIRMED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

interface Populated {
  _id?: string;
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface BackendReservation {
  _id?: string;
  id?: string;
  resourceId?: string | Populated;
  userId?: string | Populated;
  startTime?: string;
  endTime?: string;
  start?: string;
  end?: string;
  title?: string;
  purpose?: string;
  participants?: number;
  status?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

function popId(v: unknown): string {
  if (v && typeof v === 'object') {
    const o = v as { _id?: unknown; id?: unknown; toString?: () => string };
    return String(o._id ?? o.id ?? o.toString?.() ?? '');
  }
  return String(v ?? '');
}

function popName(v: unknown): string | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as { name?: string; firstName?: string; lastName?: string };
  if (o.name) return o.name;
  const full = [o.firstName, o.lastName].filter(Boolean).join(' ');
  return full || undefined;
}

export function toFrontendReservation(r: BackendReservation): Reservation {
  return {
    id: String(r._id ?? r.id),
    resourceId: popId(r.resourceId),
    resourceName: popName(r.resourceId),
    userId: popId(r.userId),
    userName: popName(r.userId),
    title: r.title ?? '',
    purpose: r.purpose ?? '',
    start: r.startTime ?? r.start ?? '',
    end: r.endTime ?? r.end ?? '',
    participants: r.participants ?? 1,
    status: RES_STATUS_MAP[r.status ?? ''] ?? 'pending',
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? new Date().toISOString(),
  };
}

// ---------- Prêts ----------

const LOAN_STATUS_MAP: Record<string, import('@plateforme/shared').Loan['status']> = {
  ACTIVE: 'active',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
};

export interface BackendLoan {
  _id?: string;
  id?: string;
  equipmentId?: string | Populated;
  borrowerId?: string | Populated;
  status?: string;
  borrowedAt?: string;
  dueAt?: string;
  returnedAt?: string;
  conditionAtLoan?: string;
  conditionAtReturn?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function toFrontendLoan(l: BackendLoan): import('@plateforme/shared').Loan {
  return {
    id: String(l._id ?? l.id),
    resourceId: popId(l.equipmentId),
    resourceName: popName(l.equipmentId),
    userId: popId(l.borrowerId),
    userName: popName(l.borrowerId),
    plannedStart: (l.borrowedAt ?? '').slice(0, 10),
    plannedEnd: (l.dueAt ?? '').slice(0, 10),
    actualEnd: l.returnedAt ? l.returnedAt.slice(0, 10) : undefined,
    status: LOAN_STATUS_MAP[l.status ?? ''] ?? 'active',
    conditionOut: l.conditionAtLoan,
    conditionIn: l.conditionAtReturn,
    notes: l.notes,
    createdAt: l.createdAt ?? new Date().toISOString(),
    updatedAt: l.updatedAt ?? new Date().toISOString(),
  } as import('@plateforme/shared').Loan;
}

// ---------- Notifications ----------

export interface BackendNotification {
  _id?: string;
  id?: string;
  title: string;
  message?: string;
  body?: string;
  type?: string;
  read?: boolean;
  data?: Record<string, unknown>;
  createdAt?: string;
}

export function toFrontendNotification(n: BackendNotification): Notification {
  return {
    id: String(n._id ?? n.id),
    userId: '',
    type: ((n.type ?? 'system').toLowerCase() || 'system') as Notification['type'],
    title: n.title,
    body: n.message ?? n.body ?? '',
    link: typeof n.data?.link === 'string' ? n.data.link : undefined,
    read: n.read ?? false,
    createdAt: n.createdAt ?? new Date().toISOString(),
  } as Notification;
}

// ---------- Lieux ----------

export interface BackendLocation {
  _id?: string;
  id?: string;
  name: string;
  type?: string;
  address?: string;
  city?: string;
  openingHours?: Location['openingHours'];
}

export function toFrontendLocation(l: BackendLocation): Location {
  const t = (l.type ?? '').toLowerCase();
  const type: Location['type'] = t.includes('campus')
    ? 'campus'
    : t.includes('fablab')
      ? 'fablab'
      : 'makerspace';
  return {
    id: String(l._id ?? l.id),
    name: l.name,
    address: l.address ?? '',
    city: l.city ?? '',
    type,
    openingHours: l.openingHours,
  };
}

// ---------- Divers ----------

export function currentUserId(): string | undefined {
  return useAuthStore.getState().user?.id;
}
