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
import { cn } from '@/lib/utils';

const DEMO_ACCOUNTS = [
  { label: 'Utilisateur', email: 'alice@demo.fr' },
  { label: 'Responsable', email: 'claire@demo.fr' },
  { label: 'Administrateur', email: 'david@demo.fr' },
];

const FEATURES = [
  'Disponibilités mises à jour en direct',
  'Réservations et prêts suivis au même endroit',
  'Un assistant pour vous guider',
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [tab, setTab] = useState<'login' | 'register'>('login');

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
    <div className="flex min-h-screen bg-canvas">
      {/* Hero */}
      <div className="hidden w-[46%] flex-col justify-between bg-[#082640] p-10 text-white lg:flex xl:p-14">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-lg font-bold">
            L
          </span>
          <span className="text-xl font-bold tracking-tight">LENDHOME</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-bold leading-tight">
            Réservez une salle ou empruntez du matériel en quelques clics.
          </h1>
          <p className="mt-4 max-w-md text-base text-brand-100">
            Une seule plateforme pour les salles, les équipements du Fablab et le suivi de vos
            prêts.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-brand-50">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs"
                  aria-hidden="true"
                >
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-brand-200">© {new Date().getFullYear()} LENDHOME — Campus</p>
      </div>

      {/* Formulaire */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <h1 className="text-2xl font-bold text-brand-700">LENDHOME</h1>
            <p className="mt-1 text-sm text-gray-500">Réservation de salles & prêt de matériel</p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <div
              className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1"
              role="tablist"
              aria-label="Mode de connexion"
            >
              {(
                [
                  ['login', 'Connexion'],
                  ['register', 'Inscription'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'rounded-md py-2 text-sm font-medium transition-colors',
                    tab === key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'register' ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-600">
                  La création de compte se fait sur demande auprès de l'administration du campus.
                </p>
                <p className="mt-3 text-sm text-gray-500">
                  Contactez votre responsable ou écrivez à{' '}
                  <a href="mailto:contact@lendhome.campus" className="text-brand-600 underline">
                    contact@lendhome.campus
                  </a>
                  .
                </p>
                <Button variant="secondary" className="mt-6" onClick={() => setTab('login')}>
                  Retour à la connexion
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <Field
                  label="Adresse e-mail"
                  htmlFor="email"
                  error={errors.email?.message}
                  required
                >
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="vous@exemple.fr"
                    {...register('email')}
                  />
                </Field>

                <Field
                  label="Mot de passe"
                  htmlFor="password"
                  error={errors.password?.message}
                  required
                >
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                  />
                </Field>

                <div className="text-right">
                  <button
                    type="button"
                    className="text-sm text-brand-600 hover:underline"
                    onClick={() =>
                      setServerError(
                        'Contactez l’administration pour réinitialiser votre mot de passe.',
                      )
                    }
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                {serverError && (
                  <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {serverError}
                  </p>
                )}

                <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
                  Se connecter
                </Button>

                <div className="border-t border-line pt-4">
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
                        className="rounded-full border border-line px-3 py-1 text-xs text-gray-600 hover:border-brand-500 hover:text-brand-600"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
