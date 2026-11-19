import { z } from 'zod';
import type { ChatRequest } from './types';

// ---------- Auth ----------

export const loginSchema = z.object({
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const userRoleSchema = z.enum(['user', 'manager', 'admin']);

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: userRoleSchema,
  avatarUrl: z.string().optional(),
  createdAt: z.string(),
});

// ---------- Ressources ----------

export const resourceTypeSchema = z.enum(['room', 'equipment']);
export const equipmentStateSchema = z.enum(['available', 'in_use', 'maintenance', 'retired']);

export const resourceSchema = z.object({
  id: z.string(),
  type: resourceTypeSchema,
  name: z.string().min(1),
  description: z.string(),
  locationId: z.string(),
  locationName: z.string().optional(),
  photos: z.array(z.string()),
  tags: z.array(z.string()),
  room: z
    .object({
      capacity: z.number().int().positive(),
      surfaceM2: z.number().positive().optional(),
      kind: z.enum(['meeting', 'workshop', 'studio', 'lab', 'open_space']),
      hasProjector: z.boolean().optional(),
      hasWhiteboard: z.boolean().optional(),
    })
    .optional(),
  equipment: z
    .object({
      inventoryNumber: z.string().min(1),
      kind: z.enum([
        '3d_printer',
        'laser_cutter',
        'cnc',
        'electronics',
        'tools',
        'audio_visual',
        'other',
      ]),
      state: equipmentStateSchema,
      serialNumber: z.string().optional(),
    })
    .optional(),
  rules: z.object({
    maxDurationHours: z.number().positive().optional(),
    minNoticeHours: z.number().nonnegative().optional(),
    requiresApproval: z.boolean().optional(),
    allowedRoles: z.array(userRoleSchema).optional(),
    notes: z.string().optional(),
  }),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const resourceCreateSchema = resourceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const resourceUpdateSchema = resourceCreateSchema.partial();

export const resourceFiltersSchema = z.object({
  type: resourceTypeSchema.optional(),
  locationId: z.string().optional(),
  minCapacity: z.coerce.number().int().positive().optional(),
  state: equipmentStateSchema.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(12),
  sort: z.enum(['name', 'capacity', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
export type ResourceFiltersInput = z.infer<typeof resourceFiltersSchema>;

// ---------- Réservations ----------

export const reservationStatusSchema = z.enum(['pending', 'approved', 'rejected', 'cancelled']);

export const reservationSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  resourceName: z.string().optional(),
  userId: z.string(),
  userName: z.string().optional(),
  title: z.string().min(1, 'Le titre est obligatoire'),
  purpose: z.string().min(1, 'Le motif est obligatoire'),
  start: z.string(),
  end: z.string(),
  participants: z.number().int().positive(),
  status: reservationStatusSchema,
  rejectionReason: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const reservationCreateSchema = z
  .object({
    resourceId: z.string().min(1, 'Veuillez choisir une ressource'),
    title: z.string().min(1, 'Le titre est obligatoire').max(120),
    purpose: z.string().min(1, 'Le motif est obligatoire').max(1000),
    start: z.string().min(1, 'La date/heure de début est obligatoire'),
    end: z.string().min(1, 'La date/heure de fin est obligatoire'),
    participants: z.number().int().positive('Au moins 1 participant'),
  })
  .refine((v) => new Date(v.end) > new Date(v.start), {
    message: 'La fin doit être postérieure au début',
    path: ['end'],
  })
  .refine((v) => (new Date(v.end).getTime() - new Date(v.start).getTime()) / 36e5 <= 24, {
    message: 'La durée maximale est de 24 h',
    path: ['end'],
  });
export type ReservationCreateInputZod = z.infer<typeof reservationCreateSchema>;

export const reservationUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  purpose: z.string().min(1).max(1000).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  participants: z.number().int().positive().optional(),
});

// ---------- Prêts ----------

export const loanStatusSchema = z.enum(['requested', 'active', 'returned', 'overdue']);

export const loanSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  resourceName: z.string().optional(),
  userId: z.string(),
  userName: z.string().optional(),
  plannedStart: z.string(),
  plannedEnd: z.string(),
  actualEnd: z.string().optional(),
  status: loanStatusSchema,
  conditionOut: z.string().optional(),
  conditionIn: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const loanCreateSchema = z
  .object({
    resourceId: z.string().min(1, 'Veuillez choisir un équipement'),
    plannedStart: z.string().min(1, 'Date de sortie prévue requise'),
    plannedEnd: z.string().min(1, 'Date de retour prévue requise'),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => new Date(v.plannedEnd) >= new Date(v.plannedStart), {
    message: 'Le retour doit être postérieur à la sortie',
    path: ['plannedEnd'],
  });
export type LoanCreateInputZod = z.infer<typeof loanCreateSchema>;

export const loanReturnSchema = z.object({
  conditionIn: z.string().min(1, 'Décrivez l’état du matériel au retour'),
  notes: z.string().max(500).optional(),
});

// ---------- Chatbot ----------

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .max(50)
    .optional(),
}) satisfies z.ZodType<ChatRequest>;

// ---------- Ré-exports de types utiles ----------

export type {
  UserRole,
  ResourceType,
  EquipmentState,
  ResourceFilters,
  ReservationStatus,
  LoanStatus,
  Paginated,
  AvailabilitySlot,
  AvailabilityResponse,
  Reservation,
  ReservationCreateInput,
  ReservationUpdateInput,
  Loan,
  LoanCreateInput,
  LoanReturnInput,
  Notification,
  ChatMessage,
  ResourceCard,
  SlotSuggestion,
  ActionProposal,
  AuditLog,
  SocketEventName,
  SocketEventPayload,
} from './types';
