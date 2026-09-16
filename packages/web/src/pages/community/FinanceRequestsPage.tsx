import FinanceRequestPage from '../FinanceRequestPage';
import { communityNav } from '../../lib/navigation';

export default function FinanceRequestsPage() {
  return (
    <FinanceRequestPage
      navItems={communityNav}
      navTitle="Community"
      title="Finance Requests"
      canCreate={false}
      canManage={true}
    />
  );
}
