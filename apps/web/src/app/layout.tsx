import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { logout as apiLogout } from '@/features/auth/api';
import { USER_ROLE_LABELS, cn } from '@/lib/utils';
import type { UserRole } from '@plateforme/shared';

const NAV_ITEMS: { to: string; label: string; icon: string; roles?: UserRole[] }[] = [
  { to: '/', label: 'Tableau de bord', icon: '▦' },
  { to: '/ressources', label: 'Ressources', icon: '▤' },
  { to: '/mes-reservations', label: 'Mes réservations', icon: '📅' },
  { to: '/reservations', label: 'Demandes', icon: '🗂', roles: ['manager', 'admin'] },
];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } finally {
      logout();
      navigate('/login');
    }
  };

  const items = NAV_ITEMS.filter((i) => !i.roles || (user && i.roles.includes(user.role)));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-gray-100 px-5">
          <span className="text-lg font-bold text-brand-700">Fablab</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Navigation principale">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )
                  }
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-gray-100 p-4 text-xs text-gray-400">
          {user ? `${user.firstName} ${user.lastName}` : ''}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <span className="text-lg font-bold text-brand-700 md:hidden">Fablab</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Menu utilisateur"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {user ? `${user.firstName[0]}${user.lastName[0]}` : '?'}
                </span>
                <span className="hidden text-sm font-medium text-gray-700 sm:block">
                  {user?.firstName}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                  <div className="border-b border-gray-100 px-4 py-2">
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
        </header>

        <nav
          className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2 md:hidden"
          aria-label="Navigation mobile"
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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
        </nav>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
