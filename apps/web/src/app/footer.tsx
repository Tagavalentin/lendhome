import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import { FOOTER_ITEMS } from './nav-items';

export function Footer() {
  const user = useAuthStore((s) => s.user);
  const items = FOOTER_ITEMS.filter((i) => !i.roles || (user && i.roles.includes(user.role)));

  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
              L
            </span>
            <span className="text-sm font-semibold text-brand-700">LENDHOME</span>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Liens du pied de page">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'text-xs transition-colors',
                    isActive ? 'font-medium text-brand-700' : 'text-gray-500 hover:text-gray-900',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <p className="text-xs text-gray-500">
          Plateforme de gestion des salles et du matériel — © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
