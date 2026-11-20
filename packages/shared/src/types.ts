// Types partagés de la plateforme de réservation de salles et prêt de matériel.

export type UserRole = 'user' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export type LocationType = 'campus' | 'fablab' | 'makerspace';

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  type: LocationType;
  openingHours?: { day: number; open: string; close: string }[];
}

export type ResourceType = 'room' | 'equipment';

export type RoomKind = 'meeting' | 'workshop' | 'studio' | 'lab' | 'open_space';
export type EquipmentKind =
  '3d_printer' | 'laser_cutter' | 'cnc' | 'electronics' | 'tools' | 'audio_visual' | 'other';

export type EquipmentState = 'available' | 'in_use' | 'maintenance' | 'retired';

export interface RoomDetails {
  capacity: number;
  surfaceM2?: number;
  kind: RoomKind;
  hasProjector?: boolean;
  hasWhiteboard?: boolean;
}

export interface EquipmentDetails {
  inventoryNumber: string;
  kind: EquipmentKind;
  state: EquipmentState;
  serialNumber?: string;
}

export interface ResourceRules {
  maxDurationHours?: number;
  minNoticeHours?: number;
  requiresApproval?: boolean;
  allowedRoles?: UserRole[];
  notes?: string;
}

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  description: string;
  locationId: string;
  locationName?: string;
  photos: string[];
  tags: string[];
  room?: RoomDetails;
  equipment?: EquipmentDetails;
  rules: ResourceRules;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceFilters {
  type?: ResourceType;
  locationId?: string;
  minCapacity?: number;
  state?: EquipmentState;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'capacity' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AvailabilitySlot {
  start: string; // ISO
  end: string; // ISO
  status: 'free' | 'busy' | 'closed' | 'blocked';
  reason?: string;
}

export interface AvailabilityResponse {
  resourceId: string;
  from: string;
  to: string;
  slots: AvailabilitySlot[];
}

export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Reservation {
  id: string;
  resourceId: string;
  resourceName?: string;
  userId: string;
  userName?: string;
  title: string;
  purpose: string;
  start: string;
  end: string;
  participants: number;
  status: ReservationStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationCreateInput {
  resourceId: string;
  title: string;
  purpose?: string;
  start: string;
  end: string;
  participants: number;
}

export interface ReservationUpdateInput {
  title?: string;
  purpose?: string;
  start?: string;
  end?: string;
  participants?: number;
}

export type LoanStatus = 'requested' | 'active' | 'returned' | 'overdue';

export interface Loan {
  id: string;
  resourceId: string;
  resourceName?: string;
  userId: string;
  userName?: string;
  plannedStart: string; // date de sortie prévue
  plannedEnd: string; // date de retour prévue
  actualEnd?: string;
  status: LoanStatus;
  conditionOut?: string;
  conditionIn?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanCreateInput {
  resourceId: string;
  plannedStart: string;
  plannedEnd: string;
  notes?: string;
}

export interface LoanReturnInput {
  conditionIn: string;
  notes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | 'reservation_created'
    | 'reservation_updated'
    | 'reservation_cancelled'
    | 'reservation_approved'
    | 'reservation_rejected'
    | 'loan_updated'
    | 'system';
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  // Réponse riche optionnelle
  resourceCards?: ResourceCard[];
  slotSuggestions?: SlotSuggestion[];
  actionProposal?: ActionProposal;
}

export interface ResourceCard {
  resourceId: string;
  name: string;
  type: ResourceType;
  locationName?: string;
  capacity?: number;
  inventoryNumber?: string;
  excerpt?: string;
}

export interface SlotSuggestion {
  resourceId: string;
  resourceName: string;
  start: string;
  end: string;
}

export interface ActionProposal {
  kind: 'create_reservation';
  label: string;
  payload: ReservationCreateInput;
  summary: string;
}

export interface ChatRequest {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface ChatResponse {
  message: ChatMessage;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ---------- Collaboration ----------

export interface Announcement {
  id: string;
  resourceId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  isOfficial: boolean;
  title: string;
  body: string;
  createdAt: string;
}

export interface DiscussionReply {
  id: string;
  announcementId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

// Événements Socket.IO (noms canoniques)
export type SocketEventName =
  | 'reservation.created'
  | 'reservation.updated'
  | 'reservation.cancelled'
  | 'loan.updated'
  | 'notification.created';

export interface SocketEventPayload {
  event: SocketEventName;
  data: Record<string, unknown>;
  at: string;
}
