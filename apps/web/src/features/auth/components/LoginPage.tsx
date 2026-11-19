import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@plateforme/shared';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';

const DEMO_ACCOUNTS = [
  { label: 'Utilisateur', email: 'alice@demo.fr' },
  { label: 'Responsable', email: 'claire@demo.fr' },
  { label: 'Administrateur', email: 'david@demo.fr' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      const res = await login(values.email, values.password);
      setSession(res.user, res.tokens.accessToken);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.status === 401
          ? 'Identifiants invalides. Vérifiez votre e-mail et votre mot de passe.'
          : err instanceof Error
            ? err.message
            : 'Connexion impossible.',
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Fablab</h1>
          <p className="mt-1 text-sm text-gray-500">Réservation de salles & prêt de matériel</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          noValidate
        >
          <Field label="Adresse e-mail" htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.fr"
              {...register('email')}
            />
          </Field>

          <Field label="Mot de passe" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
            />
          </Field>

          {serverError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Se connecter
          </Button>

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Comptes de démonstration (mot de passe : demo1234)
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setValue('email', a.email);
                    setValue('password', 'demo1234');
                  }}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-brand-500 hover:text-brand-600"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
