import { Card, PageHeader } from '@/components/ui/Feedback';
import { useAuthStore } from '@/stores/auth';

// Page d'accueil provisoire de l'étape de setup — remplacée par le
// tableau de bord complet dans feature/web-admin-dashboard.
export function HomePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div>
      <PageHeader title={`Bonjour, ${user?.firstName ?? ''}`} description="Plateforme Fablab" />
      <Card className="max-w-2xl p-6">
        <p className="text-sm text-gray-600">
          L'application est prête. Les fonctionnalités (ressources, réservations, prêts,
          notifications…) arrivent dans les prochaines branches.
        </p>
      </Card>
    </div>
  );
}
