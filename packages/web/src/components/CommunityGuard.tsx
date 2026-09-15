import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingState, ErrorState } from './ui';

interface CommunityGuardProps {
  children: ReactNode;
}

export function CommunityGuard({ children }: CommunityGuardProps) {
  const { communityId, status, primaryRole } = useAuth();

  if (status === 'loading') return <LoadingState />;

  if (status === 'unauthenticated') return <Navigate to="/signin" replace />;

  if (!primaryRole) return <Navigate to="/onboarding" replace />;

  if (!communityId) {
    return (
      <ErrorState
        title="No community selected"
        message="You need to join or create a community first."
        onRetry={() => window.location.href = '/onboarding'}
      />
    );
  }

  return <>{children}</>;
}
