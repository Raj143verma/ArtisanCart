import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types/auth';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="route-state">Restoring session...</div>;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

interface RoleRouteProps { allowedRoles: UserRole[]; }

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="route-state">Checking access...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return allowedRoles.includes(user.role) ? <Outlet /> : <Navigate to="/" replace />;
}
