import { Card, PageHeader } from '@/components/ui/Feedback';

// Paramètres plateforme — hypothèse : le contrat API ne prévoit pas encore
// d'endpoints de configuration ; page informative pour l'instant.
export function AdminSettingsPage() {
  return (
    <div>
      <PageHeader title="Paramètres" description="Configuration de la plateforme." />
      <Card className="max-w-2xl p-6">
        <h2 className="font-semibold text-gray-900">État du système</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Mode API</dt>
            <dd className="font-medium text-gray-900">
              {import.meta.env.VITE_USE_MOCKS === 'true' ? 'Mock (MSW)' : 'Backend réel'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">API</dt>
            <dd className="font-mono text-xs text-gray-700">
              {import.meta.env.VITE_API_URL || '(same-origin / mock)'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Socket.IO</dt>
            <dd className="font-mono text-xs text-gray-700">
              {import.meta.env.VITE_SOCKET_URL || '(mock local)'}
            </dd>
          </div>
        </dl>
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Les paramètres avancés (horaires par défaut, quotas, notifications e-mail) seront branchés
          quand l'équipe backend exposera les endpoints de configuration. Voir
          docs/api-assumptions.md.
        </p>
      </Card>
    </div>
  );
}
