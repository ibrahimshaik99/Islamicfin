import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { CommunityGuard } from './components/CommunityGuard';
import { adminNav } from './lib/navigation';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PhoneLoginPage from './pages/auth/PhoneLoginPage';
import PhoneRegisterPage from './pages/auth/PhoneRegisterPage';
import PhoneForgotPasswordPage from './pages/auth/PhoneForgotPasswordPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import FeaturesPage from './pages/public/FeaturesPage';
import AboutPage from './pages/public/AboutPage';
import UnauthorizedPage from './pages/errors/UnauthorizedPage';
import NotFoundPage from './pages/errors/NotFoundPage';
import DashboardRouter from './pages/dashboard/DashboardRouter';
import CommunityDashboard from './pages/dashboard/CommunityDashboard';
import MerchantDashboard from './pages/dashboard/MerchantDashboard';
import OnboardingPage from './pages/onboarding/OnboardingPage';

import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';
import CommunitiesPage, { CommunityDetail } from './pages/admin/CommunitiesPage';
import UsersPage, { UserDetail } from './pages/admin/UsersPage';
import MerchantsPage, { MerchantDetail } from './pages/admin/MerchantsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import ShariahPage from './pages/admin/ShariahPage';
import AdminApprovalsPage from './pages/admin/ApprovalsPage';
import AdminOrdersPage from './pages/admin/OrdersPage';
import AdminFinanceRequestsPage from './pages/FinanceRequestPage';

import CommunityMembersPage from './pages/community/MembersPage';
import CommunityGroupsPage from './pages/community/GroupsPage';
import CommunityAnnouncementsPage from './pages/community/AnnouncementsPage';
import CommunityMerchantsPage from './pages/community/MerchantsPage';
import CommunityMarketplacePage from './pages/community/MarketplacePage';
import CommunityOrdersPage from './pages/community/OrdersPage';
import CommunityKametiPage from './pages/community/KametiPage';
import CommunityKametiDetailPage from './pages/community/KametiDetailPage';
import CommunityServicesPage from './pages/community/ServicesPage';
import CommunitySadaqahPage from './pages/community/SadaqahPage';
import CommunityQardHasanPage from './pages/community/QardHasanPage';
import CommunityFinancePage from './pages/community/FinancePage';
import CommunityZakatPage from './pages/community/ZakatPage';
import CommunityMessagesPage from './pages/community/MessagesPage';
import CommunityReportsPage from './pages/community/ReportsPage';
import CommunitySettingsPage from './pages/community/SettingsPage';
import CommunityApprovalsPage from './pages/community/ApprovalsPage';
import CommunityFinanceRequestsPage from './pages/community/FinanceRequestsPage';

import MerchantProductsPage from './pages/merchant/ProductsPage';
import MerchantCategoriesPage from './pages/merchant/CategoriesPage';
import MerchantInventoryPage from './pages/merchant/InventoryPage';
import MerchantOrdersPage from './pages/merchant/OrdersPage';
import MerchantPaymentsPage from './pages/merchant/PaymentsPage';
import MerchantCustomersPage from './pages/merchant/CustomersPage';
import MerchantReportsPage from './pages/merchant/ReportsPage';
import MerchantSettingsPage from './pages/merchant/SettingsPage';
import MerchantFinancePage from './pages/merchant/FinancePage';
import MerchantMessagesPage from './pages/merchant/MerchantMessagesPage';
import MerchantApplyPage from './pages/merchant/MerchantApplyPage';
import MerchantOrderReturnsPage from './pages/merchant/OrderReturnsPage';
import MerchantFinanceRequestsPage from './pages/merchant/MerchantFinanceRequestsPage';

import { CustomerShell } from './pages/customer/CustomerShell';
import CustomerHome from './pages/customer/CustomerHome';
import MarketplacePage from './pages/customer/MarketplacePage';
import ProductDetailPage from './pages/customer/ProductDetailPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrdersPage from './pages/customer/OrdersPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import CustomerKametiPage from './pages/customer/CustomerKametiPage';
import CustomerKametiDetailPage from './pages/customer/CustomerKametiDetailPage';
import CustomerMessagesPage from './pages/customer/CustomerMessagesPage';
import CustomerServicesPage from './pages/customer/CustomerServicesPage';
import CustomerZakatPage from './pages/customer/CustomerZakatPage';
import CustomerSadaqahPage from './pages/customer/CustomerSadaqahPage';
import CustomerProjectsPage from './pages/customer/CustomerProjectsPage';
import CustomerFinancePage from './pages/customer/CustomerFinancePage';
import FinanceRequestPage from './pages/customer/FinanceRequestPage';
import CustomerProfilePage from './pages/customer/CustomerProfilePage';
import CustomerMorePage from './pages/customer/CustomerMorePage';
import CustomerFinanceRequestsPage from './pages/customer/CustomerFinanceRequestsPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/about" element={<AboutPage />} />

              {/* Auth routes (guest only) */}
              <Route path="/signin" element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/login" element={<Navigate to="/signin" replace />} />
              <Route path="/signup" element={<GuestRoute><RegisterPage /></GuestRoute>} />
              <Route path="/register" element={<Navigate to="/signup" replace />} />
              <Route path="/phone-signin" element={<GuestRoute><PhoneLoginPage /></GuestRoute>} />
              <Route path="/phone-signup" element={<GuestRoute><PhoneRegisterPage /></GuestRoute>} />
              <Route path="/phone-forgot-password" element={<GuestRoute><PhoneForgotPasswordPage /></GuestRoute>} />
              <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Error pages */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Onboarding (for users with no membership) */}
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

              {/* Dashboard routes */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/communities" element={<ProtectedRoute><CommunitiesPage /></ProtectedRoute>} />
              <Route path="/admin/communities/:communityId" element={<ProtectedRoute><CommunityDetail /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
              <Route path="/admin/users/:userId" element={<ProtectedRoute><UserDetail /></ProtectedRoute>} />
              <Route path="/admin/merchants" element={<ProtectedRoute><MerchantsPage /></ProtectedRoute>} />
              <Route path="/admin/merchants/:merchantId" element={<ProtectedRoute><MerchantDetail /></ProtectedRoute>} />
              <Route path="/admin/audit" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
              <Route path="/admin/shariah" element={<ProtectedRoute><ShariahPage /></ProtectedRoute>} />
              <Route path="/admin/approvals" element={<ProtectedRoute><AdminApprovalsPage /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute><AdminOrdersPage /></ProtectedRoute>} />
              <Route path="/admin/finance-requests" element={<ProtectedRoute><AdminFinanceRequestsPage navItems={adminNav} navTitle="Super Admin" title="Finance Requests" canCreate={false} canManage={true} apiPath="/admin/finance-requests" /></ProtectedRoute>} />

              {/* Community routes */}
              <Route path="/community" element={<ProtectedRoute><CommunityGuard><CommunityDashboard /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/members" element={<ProtectedRoute><CommunityGuard><CommunityMembersPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/groups" element={<ProtectedRoute><CommunityGuard><CommunityGroupsPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/announcements" element={<ProtectedRoute><CommunityGuard><CommunityAnnouncementsPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/merchants" element={<ProtectedRoute><CommunityGuard><CommunityMerchantsPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/marketplace" element={<ProtectedRoute><CommunityGuard><CommunityMarketplacePage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/orders" element={<ProtectedRoute><CommunityGuard><CommunityOrdersPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/kameti" element={<ProtectedRoute><CommunityGuard><CommunityKametiPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/kameti/:groupId" element={<ProtectedRoute><CommunityGuard><CommunityKametiDetailPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/services" element={<ProtectedRoute><CommunityGuard><CommunityServicesPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/sadaqah" element={<ProtectedRoute><CommunityGuard><CommunitySadaqahPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/qard-hasan" element={<ProtectedRoute><CommunityGuard><CommunityQardHasanPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/finance" element={<ProtectedRoute><CommunityGuard><CommunityFinancePage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/zakat" element={<ProtectedRoute><CommunityGuard><CommunityZakatPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/messages" element={<ProtectedRoute><CommunityGuard><CommunityMessagesPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/reports" element={<ProtectedRoute><CommunityGuard><CommunityReportsPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/settings" element={<ProtectedRoute><CommunityGuard><CommunitySettingsPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/approvals" element={<ProtectedRoute><CommunityGuard><CommunityApprovalsPage /></CommunityGuard></ProtectedRoute>} />
              <Route path="/community/finance-requests" element={<ProtectedRoute><CommunityGuard><CommunityFinanceRequestsPage /></CommunityGuard></ProtectedRoute>} />

              {/* Merchant routes */}
              <Route path="/merchant" element={<ProtectedRoute><MerchantDashboard /></ProtectedRoute>} />
              <Route path="/merchant/apply" element={<ProtectedRoute><MerchantApplyPage /></ProtectedRoute>} />
              <Route path="/merchant/products" element={<ProtectedRoute><MerchantProductsPage /></ProtectedRoute>} />
              <Route path="/merchant/categories" element={<ProtectedRoute><MerchantCategoriesPage /></ProtectedRoute>} />
              <Route path="/merchant/inventory" element={<ProtectedRoute><MerchantInventoryPage /></ProtectedRoute>} />
              <Route path="/merchant/orders" element={<ProtectedRoute><MerchantOrdersPage /></ProtectedRoute>} />
              <Route path="/merchant/payments" element={<ProtectedRoute><MerchantPaymentsPage /></ProtectedRoute>} />
              <Route path="/merchant/customers" element={<ProtectedRoute><MerchantCustomersPage /></ProtectedRoute>} />
              <Route path="/merchant/messages" element={<ProtectedRoute><MerchantMessagesPage /></ProtectedRoute>} />
              <Route path="/merchant/finance" element={<ProtectedRoute><MerchantFinancePage /></ProtectedRoute>} />
              <Route path="/merchant/reports" element={<ProtectedRoute><MerchantReportsPage /></ProtectedRoute>} />
              <Route path="/merchant/settings" element={<ProtectedRoute><MerchantSettingsPage /></ProtectedRoute>} />
              <Route path="/merchant/returns" element={<ProtectedRoute><MerchantOrderReturnsPage /></ProtectedRoute>} />
              <Route path="/merchant/finance-requests" element={<ProtectedRoute><MerchantFinanceRequestsPage /></ProtectedRoute>} />

              {/* Customer mobile-first routes (/app) */}
              <Route path="/app" element={<ProtectedRoute><CustomerShell><CustomerHome /></CustomerShell></ProtectedRoute>} />
              <Route path="/app/marketplace" element={<ProtectedRoute><CustomerShell><MarketplacePage /></CustomerShell></ProtectedRoute>} />
              <Route path="/app/products/:productId" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
              <Route path="/app/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
              <Route path="/app/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/app/orders" element={<ProtectedRoute><CustomerShell><OrdersPage /></CustomerShell></ProtectedRoute>} />
              <Route path="/app/orders/:orderId" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
              <Route path="/app/kameti" element={<ProtectedRoute><CustomerShell><CustomerKametiPage /></CustomerShell></ProtectedRoute>} />
              <Route path="/app/kameti/:groupId" element={<ProtectedRoute><CustomerKametiDetailPage /></ProtectedRoute>} />
              <Route path="/app/messages" element={<ProtectedRoute><CustomerShell><CustomerMessagesPage /></CustomerShell></ProtectedRoute>} />
              <Route path="/app/services" element={<ProtectedRoute><CustomerShell><CustomerServicesPage /></CustomerShell></ProtectedRoute>} />
              <Route path="/app/zakat" element={<ProtectedRoute><CustomerShell><CustomerZakatPage /></CustomerShell></ProtectedRoute>} />
              <Route path="/app/sadaqah" element={<ProtectedRoute><CustomerShell><CustomerSadaqahPage /></CustomerShell></ProtectedRoute>} />
              <Route path="/app/projects" element={<ProtectedRoute><CustomerShell><CustomerProjectsPage /></CustomerShell></ProtectedRoute>} />
              <Route path="/app/finance" element={<ProtectedRoute><CustomerShell><CustomerFinancePage /></CustomerShell></ProtectedRoute>} />
              <Route path="/app/finance/request" element={<ProtectedRoute><FinanceRequestPage /></ProtectedRoute>} />
              <Route path="/app/finance-requests" element={<ProtectedRoute><CustomerFinanceRequestsPage /></ProtectedRoute>} />
              <Route path="/app/profile" element={<ProtectedRoute><CustomerShell><CustomerProfilePage /></CustomerShell></ProtectedRoute>} />
              <Route path="/app/more" element={<ProtectedRoute><CustomerShell><CustomerMorePage /></CustomerShell></ProtectedRoute>} />

              {/* Legacy customer routes redirect to /app */}
              <Route path="/customer/*" element={<ProtectedRoute><Navigate to="/app" replace /></ProtectedRoute>} />

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
