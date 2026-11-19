import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString('fr-FR', opts ?? { dateStyle: 'medium' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
};

export const LOAN_STATUS_LABELS: Record<string, string> = {
  requested: 'Demandé',
  active: 'En cours',
  returned: 'Retourné',
  overdue: 'En retard',
};

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  room: 'Salle',
  equipment: 'Équipement',
};

export const EQUIPMENT_STATE_LABELS: Record<string, string> = {
  available: 'Disponible',
  in_use: 'En utilisation',
  maintenance: 'En maintenance',
  retired: 'Retiré',
};

export const ROOM_KIND_LABELS: Record<string, string> = {
  meeting: 'Salle de réunion',
  workshop: 'Atelier',
  studio: 'Studio',
  lab: 'Laboratoire',
  open_space: 'Espace ouvert',
};

export const EQUIPMENT_KIND_LABELS: Record<string, string> = {
  '3d_printer': 'Imprimante 3D',
  laser_cutter: 'Découpeuse laser',
  cnc: 'Fraiseuse CNC',
  electronics: 'Électronique',
  tools: 'Outillage',
  audio_visual: 'Audio/vidéo',
  other: 'Autre',
};

export const USER_ROLE_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  manager: 'Responsable',
  admin: 'Administrateur',
};
