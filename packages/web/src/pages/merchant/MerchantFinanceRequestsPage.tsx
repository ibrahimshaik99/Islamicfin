import FinanceRequestPage from '../FinanceRequestPage';
import { merchantNav } from '../../lib/navigation';

export default function MerchantFinanceRequestsPage() {
  return (
    <FinanceRequestPage
      navItems={merchantNav}
      navTitle="Merchant"
      title="Finance Requests"
      canCreate={true}
      canManage={true}
    />
  );
}
