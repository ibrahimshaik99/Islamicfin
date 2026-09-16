import FinanceRequestPage from '../FinanceRequestPage';
import { customerNav } from '../../lib/navigation';
import { CustomerShell } from './CustomerShell';

export default function CustomerFinanceRequestsPage() {
  return (
    <CustomerShell>
      <FinanceRequestPage
        navItems={customerNav}
        navTitle="PWA"
        title="Finance Requests"
        canCreate={true}
        canManage={false}
      />
    </CustomerShell>
  );
}
