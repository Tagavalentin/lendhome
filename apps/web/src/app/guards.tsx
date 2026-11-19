import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { fetchMe } from '@/features/auth/api';
import type { UserRole } from '@plateforme/shared';
import { Spinner } from '@/components/ui/Feedback';

export function RequireAuth() {
  const { isAuthenticated, isLoading, user, setUser, logout } = useAuthStore();
  const location = useLocation();

  // Bootstrap de session : si un token existe, on recharge le profil via GET /api/me.
  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchMe()
        .then(setUser)
        .catch(() => logout());
    }
  }, [isAuthenticated, user, setUser, logout]);

  if (isLoading) return <Spinner label="Vérification de la session…" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

const ROLE_RANK: Record<UserRole, number> = { user: 0, manager: 1, admin: 2 };

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  const minRank = Math.min(...roles.map((r) => ROLE_RANK[r]));
  if (ROLE_RANK[user.role] < minRank) {
    return <Navigate to="/403" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

export function GuestOnly() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <Spinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
