import { Component, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8"
        >
          <h1 className="text-xl font-semibold text-gray-900">
            Une erreur inattendue est survenue
          </h1>
          <p className="text-sm text-gray-500">
            L'application a rencontré un problème. Réessayez ou rechargez la page.
          </p>
          <Button onClick={() => window.location.reload()}>Recharger la page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
