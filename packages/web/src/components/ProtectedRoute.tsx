import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, roleToDashboardRoute } from '../context/AuthContext';
import { LoadingState } from '../components/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, status, primaryRole } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'unauthenticated' || !user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (requiredRoles && primaryRole && !requiredRoles.includes(primaryRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, status, primaryRole } = useAuth();

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'authenticated' && user) {
    // Redirect to the correct dashboard based on user's role
    return <Navigate to={roleToDashboardRoute(primaryRole)} replace />;
  }

  return <>{children}</>;
}
