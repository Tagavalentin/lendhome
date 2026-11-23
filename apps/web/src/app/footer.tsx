import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import { FOOTER_ITEMS } from './nav-items';

export function Footer() {
  const user = useAuthStore((s) => s.user);
  const items = FOOTER_ITEMS.filter((i) => !i.roles || (user && i.roles.includes(user.role)));

  return (
    <footer className="border-t border-line bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                L
              </span>
              <span className="text-base font-bold tracking-tight text-brand-700">LENDHOME</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              La plateforme de gestion des salles et du matériel de votre fablab.
            </p>
          </div>

          <nav
            className="grid grid-cols-2 gap-x-12 gap-y-3 sm:grid-cols-3"
            aria-label="Liens du pied de page"
          >
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'text-sm transition-colors',
                    isActive ? 'font-medium text-brand-700' : 'text-gray-500 hover:text-gray-900',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} LENDHOME — Tous droits réservés.
          </p>
          <p className="text-xs text-gray-400">Plateforme de gestion des salles et du matériel</p>
        </div>
      </div>
    </footer>
  );
}
