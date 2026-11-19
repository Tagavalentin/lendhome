import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function ForbiddenPage() {
  const location = useLocation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-6xl font-bold text-gray-200" aria-hidden="true">
        403
      </p>
      <h1 className="text-xl font-semibold text-gray-900">Accès refusé</h1>
      <p className="max-w-md text-sm text-gray-500">
        Vous n'avez pas les droits nécessaires pour accéder à {location.pathname}. Contactez un
        administrateur si vous pensez qu'il s'agit d'une erreur.
      </p>
      <Link to="/">
        <Button variant="secondary">Retour au tableau de bord</Button>
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-6xl font-bold text-gray-200" aria-hidden="true">
        404
      </p>
      <h1 className="text-xl font-semibold text-gray-900">Page introuvable</h1>
      <p className="max-w-md text-sm text-gray-500">
        La page demandée n'existe pas ou a été déplacée.
      </p>
      <Link to="/">
        <Button variant="secondary">Retour au tableau de bord</Button>
      </Link>
    </div>
  );
}
