import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireAuth, RequireRole } from './guards';
import { AppLayout } from './layout';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { ResourceListPage } from '@/features/resources/pages/ResourceListPage';
import { ResourceDetailPage } from '@/features/resources/pages/ResourceDetailPage';
import { AvailabilityPage } from '@/features/availability/pages/AvailabilityPage';
import { MyReservationsPage } from '@/features/reservations/pages/MyReservationsPage';
import { ReservationRequestsPage } from '@/features/reservations/pages/ReservationRequestsPage';
import { ForbiddenPage, NotFoundPage } from '@/pages/ErrorPages';
import { HomePage } from '@/pages/HomePage';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="ressources" element={<ResourceListPage />} />
          <Route path="ressources/:id" element={<ResourceDetailPage />} />
          <Route path="ressources/:id/disponibilite" element={<AvailabilityPage />} />
          <Route path="mes-reservations" element={<MyReservationsPage />} />

          <Route element={<RequireRole roles={['manager', 'admin']} />}>
            <Route path="reservations" element={<ReservationRequestsPage />} />
          </Route>

          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
