import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingState } from '../../components/ui';
import SuperAdminDashboard from './SuperAdminDashboard';
import CommunityDashboard from './CommunityDashboard';
import MerchantDashboard from './MerchantDashboard';

export default function DashboardRouter() {
  const { user, status, primaryRole } = useAuth();

  if (status === 'loading') return <LoadingState />;
  if (status === 'unauthenticated' || !user) return <Navigate to="/signin" replace />;
  if (!primaryRole) return <Navigate to="/onboarding" replace />;

  switch (primaryRole) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'COMMUNITY_OWNER':
    case 'COMMUNITY_ADMIN':
    case 'COMMUNITY_FINANCE_MANAGER':
    case 'COMMUNITY_MODERATOR':
      return <CommunityDashboard />;
    case 'MERCHANT':
    case 'MERCHANT_STAFF':
      return <MerchantDashboard />;
    case 'CUSTOMER':
      return <Navigate to="/app" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
}
