/**
 * Guard de sesión — equivalente a CanActivate de Angular.
 * Redirige a /onboarding si no hay sessionToken.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';

export function RequireSession() {
  const token = useSessionStore((state) => state.sessionToken);

  if (!token) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
