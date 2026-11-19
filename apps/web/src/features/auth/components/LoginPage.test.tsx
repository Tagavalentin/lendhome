import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { handlers } from '@/mocks/handlers';
import { setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { LoginPage } from './LoginPage';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  setAccessToken(null);
  useAuthStore.setState({ user: null, isAuthenticated: false });
});
afterAll(() => server.close());

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  it('affiche le formulaire de connexion', () => {
    renderLogin();
    expect(screen.getByLabelText(/adresse e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('affiche une erreur sur identifiants invalides', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/adresse e-mail/i), 'alice@demo.fr');
    await user.type(screen.getByLabelText(/mot de passe/i), 'mauvais-mdp');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/identifiants invalides/i),
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('connecte et remplit la session en cas de succès', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/adresse e-mail/i), 'alice@demo.fr');
    await user.type(screen.getByLabelText(/mot de passe/i), 'demo1234');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    expect(useAuthStore.getState().user?.email).toBe('alice@demo.fr');
  });
});
