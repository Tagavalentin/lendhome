import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { USE_MOCKS } from './lib/api';

async function bootstrap() {
  if (USE_MOCKS && typeof window !== 'undefined') {
    const { startMocks } = await import('./mocks/browser');
    await startMocks();
  }

  // Enregistre le handler 401 → déconnexion (évite l'import circulaire).
  const { setUnauthorizedHandler } = await import('./lib/api');
  const { useAuthStore } = await import('./stores/auth');
  setUnauthorizedHandler(() => useAuthStore.getState().logout());

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
