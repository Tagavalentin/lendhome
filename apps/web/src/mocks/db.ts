// Base de données en mémoire pour les mocks MSW.
// L'état est modifiable : les mutations (création/annulation de réservation,
// prêt, retour) modifient réellement les réponses suivantes.

import type {
  Announcement,
  AuditLog,
  DiscussionReply,
  Loan,
  Location,
  Notification,
  Reservation,
  Resource,
  User,
} from '@plateforme/shared';
import { emitMockSocketEvent } from '@/lib/socket';

// ---------- Helpers ----------

const now = () => new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (d: number, h = 9) => {
  const x = now();
  x.setDate(x.getDate() + d);
  x.setHours(h, 0, 0, 0);
  return x;
};

let seq = 1000;
const nid = (prefix: string) => `${prefix}_${++seq}_${Math.random().toString(36).slice(2, 8)}`;

// ---------- Seed ----------

const users: User[] = [
  {
    id: 'u_alice',
    email: 'alice@demo.fr',
    firstName: 'Alice',
    lastName: 'Martin',
    role: 'user',
    createdAt: iso(daysFromNow(-120)),
  },
  {
    id: 'u_ben',
    email: 'ben@demo.fr',
    firstName: 'Ben',
    lastName: 'Diallo',
    role: 'user',
    createdAt: iso(daysFromNow(-90)),
  },
  {
    id: 'u_claire',
    email: 'claire@demo.fr',
    firstName: 'Claire',
    lastName: 'Rousseau',
    role: 'manager',
    createdAt: iso(daysFromNow(-200)),
  },
  {
    id: 'u_david',
    email: 'david@demo.fr',
    firstName: 'David',
    lastName: 'Nguyen',
    role: 'admin',
    createdAt: iso(daysFromNow(-300)),
  },
];

const DEMO_PASSWORD = 'demo1234';

const locations: Location[] = [
  {
    id: 'loc_campus',
    name: 'Campus Innovant',
    address: '12 rue des Lilas',
    city: 'Lyon',
    type: 'campus',
    openingHours: [
      { day: 1, open: '08:00', close: '20:00' },
      { day: 2, open: '08:00', close: '20:00' },
      { day: 3, open: '08:00', close: '20:00' },
      { day: 4, open: '08:00', close: '20:00' },
      { day: 5, open: '08:00', close: '20:00' },
      { day: 6, open: '09:00', close: '18:00' },
    ],
  },
  {
    id: 'loc_fablab',
    name: 'Fablab des Gobelins',
    address: '45 avenue des Gobelins',
    city: 'Paris',
    type: 'fablab',
    openingHours: [
      { day: 1, open: '10:00', close: '19:00' },
      { day: 2, open: '10:00', close: '19:00' },
      { day: 3, open: '10:00', close: '19:00' },
      { day: 4, open: '10:00', close: '19:00' },
      { day: 5, open: '10:00', close: '19:00' },
      { day: 6, open: '10:00', close: '18:00' },
      { day: 7, open: '10:00', close: '18:00' },
    ],
  },
];

const resources: Resource[] = [
  {
    id: 'res_salle_a',
    type: 'room',
    name: 'Salle de réunion Agora',
    description:
      'Salle lumineuse de 40 m² au cœur du campus, idéale pour les réunions d’équipe et présentations. Vidéoprojecteur et tableau blanc inclus.',
    locationId: 'loc_campus',
    locationName: 'Campus Innovant',
    photos: ['/images/agora.jpg', '/images/conference-table.jpg'],
    tags: ['réunion', 'présentation', '40 places'],
    room: { capacity: 12, surfaceM2: 40, kind: 'meeting', hasProjector: true, hasWhiteboard: true },
    rules: { maxDurationHours: 4, minNoticeHours: 2, requiresApproval: false },
    isActive: true,
    createdAt: iso(daysFromNow(-150)),
    updatedAt: iso(daysFromNow(-10)),
  },
  {
    id: 'res_salle_b',
    type: 'room',
    name: 'Atelier Fabrique',
    description:
      'Grand atelier équipé de tables de travail, établi, et accès direct au parc de machines. Parfait pour les projets collaboratifs.',
    locationId: 'loc_campus',
    locationName: 'Campus Innovant',
    photos: ['/images/salle-reunion.jpg', '/images/vergadertafel.jpg'],
    tags: ['atelier', 'fabrication', '30 places'],
    room: { capacity: 24, surfaceM2: 90, kind: 'workshop', hasWhiteboard: true },
    rules: {
      maxDurationHours: 8,
      minNoticeHours: 24,
      requiresApproval: true,
      notes: 'Accès machines sur formation.',
    },
    isActive: true,
    createdAt: iso(daysFromNow(-140)),
    updatedAt: iso(daysFromNow(-5)),
  },
  {
    id: 'res_salle_c',
    type: 'room',
    name: 'Studio Podcast',
    description: 'Studio d’enregistrement insonorisé avec micros et interface audio.',
    locationId: 'loc_fablab',
    locationName: 'Fablab des Gobelins',
    photos: [
      '/images/studio1.jpg',
      '/images/studio2.jpg',
      '/images/studio3.jpg',
      '/images/studio4.jpg',
    ],
    tags: ['audio', 'enregistrement', '6 places'],
    room: { capacity: 6, surfaceM2: 18, kind: 'studio' },
    rules: { maxDurationHours: 3, minNoticeHours: 1 },
    isActive: true,
    createdAt: iso(daysFromNow(-100)),
    updatedAt: iso(daysFromNow(-2)),
  },
  {
    id: 'res_salle_d',
    type: 'room',
    name: 'Open Space Meridian',
    description: 'Espace de coworking flexible avec boxes et fontaines à eau.',
    locationId: 'loc_fablab',
    locationName: 'Fablab des Gobelins',
    photos: ['/images/ordinateur.jpg'],
    tags: ['coworking', 'flexible'],
    room: { capacity: 30, surfaceM2: 120, kind: 'open_space' },
    rules: { maxDurationHours: 8, minNoticeHours: 0 },
    isActive: true,
    createdAt: iso(daysFromNow(-80)),
    updatedAt: iso(daysFromNow(-1)),
  },
  {
    id: 'res_printer',
    type: 'equipment',
    name: 'Imprimante 3D Prusa MK4',
    description:
      'Imprimante 3D FDM fiable, filament PLA/PETG/TPU. Formation requise pour la première utilisation.',
    locationId: 'loc_fablab',
    locationName: 'Fablab des Gobelins',
    photos: ['/images/imp-dell.jpg', '/images/imprimate-dell.jpg'],
    tags: ['impression 3D', 'FDM'],
    equipment: {
      inventoryNumber: 'EQ-3DP-001',
      kind: '3d_printer',
      state: 'available',
      serialNumber: 'SN-88412',
    },
    rules: {
      minNoticeHours: 0,
      notes: 'Une formation est obligatoire avant la première location.',
    },
    isActive: true,
    createdAt: iso(daysFromNow(-60)),
    updatedAt: iso(daysFromNow(-3)),
  },
  {
    id: 'res_laser',
    type: 'equipment',
    name: 'Découpeuse laser xTool',
    description: 'Découpe et gravure laser sur bois, acrylique, tissu. Fichier vectoriel requis.',
    locationId: 'loc_fablab',
    locationName: 'Fablab des Gobelins',
    photos: ['/images/laser-xtool.jpg'],
    tags: ['laser', 'gravure'],
    equipment: {
      inventoryNumber: 'EQ-LAS-014',
      kind: 'laser_cutter',
      state: 'available',
      serialNumber: 'SN-55210',
    },
    rules: { minNoticeHours: 0 },
    isActive: true,
    createdAt: iso(daysFromNow(-60)),
    updatedAt: iso(daysFromNow(-3)),
  },
  {
    id: 'res_cnc',
    type: 'equipment',
    name: 'Fraiseuse CNC Shapeoko',
    description: 'Fraiseuse 3 axes pour bois et plastiques. G-code fourni par l’utilisateur.',
    locationId: 'loc_campus',
    locationName: 'Campus Innovant',
    photos: ['/images/cnc-shapeoko.jpg'],
    tags: ['CNC', 'usinage'],
    equipment: {
      inventoryNumber: 'EQ-CNC-007',
      kind: 'cnc',
      state: 'available',
      serialNumber: 'SN-30119',
    },
    rules: { minNoticeHours: 24, notes: 'Briefing sécurité obligatoire.' },
    isActive: true,
    createdAt: iso(daysFromNow(-55)),
    updatedAt: iso(daysFromNow(-4)),
  },
  {
    id: 'res_camera',
    type: 'equipment',
    name: 'Kit vidéo Sony FX30',
    description: 'Caméra cinéma + stabilisateur + micros pour tournages. Caution 500 €.',
    locationId: 'loc_fablab',
    locationName: 'Fablab des Gobelins',
    photos: ['/images/fx30-1.jpg', '/images/fx30-2.jpg', '/images/fx30-3.jpg'],
    tags: ['vidéo', 'tournage'],
    equipment: {
      inventoryNumber: 'EQ-AV-022',
      kind: 'audio_visual',
      state: 'available',
      serialNumber: 'SN-77021',
    },
    rules: { minNoticeHours: 24, notes: 'Caution exigée, pièce d’identité requise.' },
    isActive: true,
    createdAt: iso(daysFromNow(-50)),
    updatedAt: iso(daysFromNow(-6)),
  },
  {
    id: 'res_multimeter',
    type: 'equipment',
    name: 'Multimètre Fluke 87V',
    description: 'Multimètre professionnel pour mesures électroniques.',
    locationId: 'loc_campus',
    locationName: 'Campus Innovant',
    photos: ['/images/fluke-87v.jpg'],
    tags: ['électronique', 'mesure'],
    equipment: {
      inventoryNumber: 'EQ-ELE-031',
      kind: 'electronics',
      state: 'in_use',
      serialNumber: 'SN-11234',
    },
    rules: {},
    isActive: true,
    createdAt: iso(daysFromNow(-45)),
    updatedAt: iso(daysFromNow(-1)),
  },
];

// Réservations seed
const reservations: Reservation[] = [
  {
    id: 'resv_seed1',
    resourceId: 'res_salle_a',
    resourceName: 'Salle de réunion Agora',
    userId: 'u_ben',
    userName: 'Ben Diallo',
    title: 'Point hebdo équipe',
    purpose: 'Réunion de suivi hebdomadaire',
    start: iso(daysFromNow(1, 10)),
    end: iso(daysFromNow(1, 11)),
    participants: 8,
    status: 'approved',
    createdAt: iso(daysFromNow(-2)),
    updatedAt: iso(daysFromNow(-2)),
  },
  {
    id: 'resv_seed2',
    resourceId: 'res_salle_a',
    resourceName: 'Salle de réunion Agora',
    userId: 'u_claire',
    userName: 'Claire Rousseau',
    title: 'Atelier design',
    purpose: 'Session de co-conception avec les usagers',
    start: iso(daysFromNow(2, 14)),
    end: iso(daysFromNow(2, 17)),
    participants: 10,
    status: 'pending',
    createdAt: iso(daysFromNow(-1)),
    updatedAt: iso(daysFromNow(-1)),
  },
  {
    id: 'resv_seed3',
    resourceId: 'res_printer',
    resourceName: 'Imprimante 3D Prusa MK4',
    userId: 'u_alice',
    userName: 'Alice Martin',
    title: 'Pièces projet robot',
    purpose: 'Impression de boîtiers pour le robot',
    start: iso(daysFromNow(3, 9)),
    end: iso(daysFromNow(3, 12)),
    participants: 1,
    status: 'approved',
    createdAt: iso(daysFromNow(-3)),
    updatedAt: iso(daysFromNow(-3)),
  },
];

const loans: Loan[] = [
  {
    id: 'loan_seed1',
    resourceId: 'res_camera',
    resourceName: 'Kit vidéo Sony FX30',
    userId: 'u_ben',
    userName: 'Ben Diallo',
    plannedStart: iso(daysFromNow(-2)).slice(0, 10),
    plannedEnd: iso(daysFromNow(5)).slice(0, 10),
    status: 'active',
    conditionOut: 'Parfait état',
    createdAt: iso(daysFromNow(-2)),
    updatedAt: iso(daysFromNow(-2)),
  },
  {
    id: 'loan_seed2',
    resourceId: 'res_printer',
    resourceName: 'Imprimante 3D Prusa MK4',
    userId: 'u_alice',
    userName: 'Alice Martin',
    plannedStart: iso(daysFromNow(-10)).slice(0, 10),
    plannedEnd: iso(daysFromNow(-5)).slice(0, 10),
    actualEnd: iso(daysFromNow(-4)).slice(0, 10),
    status: 'returned',
    conditionOut: 'Bon état',
    conditionIn: 'Bon état, buse nettoyée',
    createdAt: iso(daysFromNow(-10)),
    updatedAt: iso(daysFromNow(-4)),
  },
];

const notifications: Notification[] = [
  {
    id: 'notif_seed1',
    userId: 'u_alice',
    type: 'reservation_approved',
    title: 'Réservation approuvée',
    body: 'Votre réservation « Pièces projet robot » a été approuvée.',
    link: '/reservations',
    read: false,
    createdAt: iso(daysFromNow(-1, 9)),
  },
  {
    id: 'notif_seed2',
    userId: 'u_alice',
    type: 'system',
    title: 'Bienvenue sur la plateforme',
    body: 'Réservez des salles et empruntez du matériel en quelques clics.',
    link: '/ressources',
    read: true,
    createdAt: iso(daysFromNow(-5)),
  },
];

const auditLogs: AuditLog[] = [
  {
    id: 'audit_seed1',
    userId: 'u_claire',
    userName: 'Claire Rousseau',
    action: 'reservation.approve',
    entityType: 'reservation',
    entityId: 'resv_seed1',
    createdAt: iso(daysFromNow(-2, 11)),
  },
  {
    id: 'audit_seed2',
    userId: 'u_david',
    userName: 'David Nguyen',
    action: 'resource.update',
    entityType: 'resource',
    entityId: 'res_salle_a',
    createdAt: iso(daysFromNow(-10, 15)),
  },
];

const announcements: Announcement[] = [
  {
    id: 'ann_seed1',
    resourceId: 'res_salle_a',
    authorId: 'u_claire',
    authorName: 'Claire Rousseau',
    authorRole: 'manager',
    isOfficial: true,
    title: 'Fermeture exceptionnelle vendredi',
    body: 'La salle sera fermée vendredi de 14h à 16h pour maintenance du vidéoprojecteur.',
    createdAt: iso(daysFromNow(-1)),
  },
];

const discussionReplies: DiscussionReply[] = [];

// ---------- Store exposé ----------

export interface DbState {
  users: User[];
  locations: Location[];
  resources: Resource[];
  reservations: Reservation[];
  loans: Loan[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  announcements: Announcement[];
  discussionReplies: DiscussionReply[];
}

export const db: DbState = {
  users,
  locations,
  resources,
  reservations,
  loans,
  notifications,
  auditLogs,
  announcements,
  discussionReplies,
};

export function findUserByEmail(email: string) {
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function userName(userId: string) {
  const u = db.users.find((x) => x.id === userId);
  return u ? `${u.firstName} ${u.lastName}` : 'Inconnu';
}

export function resourceName(resourceId: string) {
  return db.resources.find((r) => r.id === resourceId)?.name ?? 'Ressource';
}

export function addNotification(n: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
  const notif: Notification = { ...n, id: nid('notif'), read: false, createdAt: iso(now()) };
  db.notifications.unshift(notif);
  emitMockSocketEvent('notification.created', { notification: notif });
  return notif;
}

export function addAudit(entry: Omit<AuditLog, 'id' | 'createdAt'>) {
  db.auditLogs.unshift({ ...entry, id: nid('audit'), createdAt: iso(now()) });
}

export { nid, iso, daysFromNow, DEMO_PASSWORD };
