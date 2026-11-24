import type { UserRole } from '@plateforme/shared';

export const NAV_ITEMS: { to: string; label: string; roles?: UserRole[]; end?: boolean }[] = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/mes-reservations', label: 'Réservations' },
  { to: '/ressources', label: 'Salles et ressources' },
  { to: '/mes-prets', label: 'Prêts de matériel' },
  { to: '/calendrier', label: 'Calendrier' },
  { to: '/statistiques', label: 'Statistiques' },
  { to: '/reservations', label: 'Demandes', roles: ['manager', 'admin'] },
  { to: '/prets', label: 'Prêts à traiter', roles: ['manager', 'admin'] },
  { to: '/admin', label: 'Administration', roles: ['admin'], end: true },
  { to: '/admin/audit', label: "Journal d'audit", roles: ['admin'] },
];
