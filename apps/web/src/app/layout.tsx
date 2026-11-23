import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { logout as apiLogout } from '@/features/auth/api';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { useRealtime } from '@/hooks/useRealtime';
import { USER_ROLE_LABELS, cn } from '@/lib/utils';
import type { UserRole } from '@plateforme/shared';

const NAV_ITEMS: { to: string; label: string; roles?: UserRole[]; end?: boolean }[] = [
  { to: '/', label: 'Tableau de bord' },
  { to: '/ressources', label: 'Salles et matériel' },
  { to: '/mes-reservations', label: 'Mes réservations' },
  { to: '/reservations', label: 'Demandes', roles: ['manager', 'admin'] },
  { to: '/mes-prets', label: 'Mes prêts' },
  { to: '/prets', label: 'Prêts à traiter', roles: ['manager', 'admin'] },
  { to: '/admin', label: 'Administration', roles: ['admin'], end: true },
  { to: '/audit', label: "Journal d'audit", roles: ['admin'] },
];

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  connected: { label: 'En direct', cls: 'bg-brand-100 text-brand-800' },
  reconnecting: { label: 'Reconnexion…', cls: 'bg-accent-100 text-amber-800' },
  disconnected: { label: 'Hors ligne', cls: 'bg-gray-100 text-gray-500' },
};

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = useRealtime();

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } finally {
      logout();
      navigate('/login');
    }
  };

  const openAssistant = () => {
    window.dispatchEvent(new CustomEvent('lendhome:open-chat'));
  };

  const items = NAV_ITEMS.filter((i) => !i.roles || (user && i.roles.includes(user.role)));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="flex h-16 items-center gap-6 px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              L
            </span>
            <span className="text-lg font-bold tracking-tight text-brand-700">LENDHOME</span>
          </NavLink>

          <nav
            className="hidden flex-1 items-center gap-1 lg:flex"
            aria-label="Navigation principale"
          >
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={openAssistant}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              Assistant
            </button>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <span
              className={cn(
                'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex',
                STATUS_LABEL[status]?.cls,
              )}
              title="État de la connexion temps réel"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {STATUS_LABEL[status]?.label}
            </span>
            <NotificationBell />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Mon profil"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-gray-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {user ? `${user.firstName[0]}${user.lastName[0]}` : '?'}
                </span>
                <span className="hidden text-sm font-medium text-gray-700 sm:block">
                  {user?.firstName}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-line bg-white py-1 shadow-lg">
                  <div className="border-b border-line px-4 py-2">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <p className="mt-1 text-xs font-medium text-brand-600">
                      {USER_ROLE_LABELS[user?.role ?? 'user']}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 lg:hidden"
          aria-label="Navigation mobile"
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end || item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={openAssistant}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-gray-600"
          >
            Assistant
          </button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
