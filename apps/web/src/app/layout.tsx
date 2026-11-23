import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { logout as apiLogout } from '@/features/auth/api';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { Footer } from './footer';
import { NAV_ITEMS } from './nav-items';
import { USER_ROLE_LABELS, cn } from '@/lib/utils';

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] flex-col bg-[#082640] px-4 py-5 text-white lg:flex">
        <NavLink to="/" className="mb-8 flex items-center gap-2 px-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2aaec1] text-sm font-bold text-white">
            L
          </span>
          <span className="text-lg font-bold tracking-tight">
            <span>Lend</span>
            <span className="font-normal text-[#83d2dd]">home</span>
          </span>
        </NavLink>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Navigation principale">
          {items.map((item) => (
            <NavLink
              key={`${item.to}-${item.label}`}
              to={item.to}
              end={item.end || item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#174b70] text-white'
                    : 'text-[#b9c9d6] hover:bg-[#103654] hover:text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={openAssistant}
            className="mt-1 rounded-md px-3 py-2.5 text-left text-sm font-medium text-[#b9c9d6] hover:bg-[#103654] hover:text-white"
          >
            Assistant
          </button>
        </nav>

        <div className="relative border-t border-white/10 pt-4" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Mon profil"
            aria-expanded={menuOpen}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-[#103654]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#21aabc] text-sm font-bold">
              {user ? `${user.firstName[0]}${user.lastName[0]}` : '?'}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user?.firstName}</span>
              <span className="block text-xs text-[#aebfd0]">
                {USER_ROLE_LABELS[user?.role ?? 'user']}
              </span>
            </span>
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-full rounded-xl border border-line bg-white py-1 text-gray-900 shadow-xl">
              <div className="border-b border-line px-4 py-2">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-line bg-white px-4 lg:hidden">
        <NavLink to="/" className="flex items-center gap-2 text-[#082640]">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2aaec1] text-sm font-bold text-white">
            L
          </span>
          <span className="font-bold">Lendhome</span>
        </NavLink>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Mon profil"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#21aabc] text-xs font-bold text-white"
          >
            {user ? `${user.firstName[0]}${user.lastName[0]}` : '?'}
          </button>
        </div>
      </header>

      <nav
        className="sticky top-14 z-30 flex overflow-x-auto border-b border-line bg-white px-3 py-2 lg:hidden"
        aria-label="Navigation mobile"
      >
        {items.slice(0, 6).map((item) => (
          <NavLink
            key={`${item.to}-${item.label}`}
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

      <main className="min-h-[calc(100vh-3.5rem)] lg:ml-[248px]">
        <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}
