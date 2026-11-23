import type { UserRole } from '@plateforme/shared';

export const NAV_ITEMS: { to: string; label: string; roles?: UserRole[] }[] = [
  { to: '/', label: 'Tableau de bord' },
  { to: '/ressources', label: 'Salles et matériel' },
  { to: '/mes-reservations', label: 'Mes réservations' },
  { to: '/reservations', label: 'Demandes', roles: ['manager', 'admin'] },
  { to: '/mes-prets', label: 'Mes prêts' },
  { to: '/prets', label: 'Prêts à traiter', roles: ['manager', 'admin'] },
  { to: '/admin', label: 'Administration', roles: ['admin'] },
  { to: '/admin/audit', label: "Journal d'audit", roles: ['admin'] },
];
