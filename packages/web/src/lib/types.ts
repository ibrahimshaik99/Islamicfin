// ---- Error types ----

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  error: ApiError;
}

// ---- Pagination ----

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---- Auth ----

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthMeResponse {
  data: User;
}

export interface AuthLoginResponse {
  data: Pick<User, 'id' | 'name' | 'email'>;
}

// ---- Community ----

export interface Community {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  contactPhone?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING';
  createdAt: string;
  updatedAt: string;
}

export interface CommunityDashboard {
  community: Community;
  stats: {
    members: number;
    groups: number;
    announcements: number;
  };
}

export interface CommunityMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  audience?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
}

// ---- Admin ----

export interface AdminDashboard {
  communities: { total: number; active: number };
  users: { total: number; active: number };
  merchants: { total: number; pending: number };
  orders: { total: number };
  subscriptions: { active: number };
  finance: { pendingReviews: number };
  crowdfunding: { active: number };
  kameti: { total: number };
  riskFlags: { total: number; flagged: number };
  recentAuditLogs: AuditLog[];
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  communityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// ---- Merchant ----

export interface Merchant {
  id: string;
  communityId: string;
  userId: string;
  businessName: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  upiId?: string;
  upiQrUrl?: string;
  address?: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
}

// ---- Marketplace ----

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Product {
  id: string;
  communityId: string;
  merchantId: string;
  categoryId?: string;
  name: string;
  description?: string;
  price: string;
  salePrice?: string;
  sku?: string;
  stockQuantity: number;
  status: 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK' | 'ARCHIVED';
  images: ProductImage[];
  createdAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  sortOrder: number;
}

// ---- Orders ----

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REJECTED' | 'PAYMENT_REPORTED' | 'PAYMENT_VERIFIED' | 'PAYMENT_REJECTED';
export type PaymentStatus = 'UNPAID' | 'PAYMENT_REPORTED' | 'PAYMENT_VERIFIED' | 'PAYMENT_REJECTED';

export interface Order {
  id: string;
  communityId: string;
  customerId: string;
  merchantId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'COD' | 'DIRECT_UPI';
  subtotal: string;
  deliveryFee: string;
  total: string;
  shippingAddress?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

// ---- Kameti ----

export type KametiGroupStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'PAUSED';
export type KametiFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface KametiGroup {
  id: string;
  communityId: string;
  name: string;
  description?: string;
  contributionAmount: string;
  frequency: KametiFrequency;
  totalMembers: number;
  currentMembers: number;
  startDate: string;
  endDate: string;
  status: KametiGroupStatus;
  createdAt: string;
}

export interface KametiMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: string;
  position: number;
}

export interface KametiPeriod {
  id: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
  status: string;
}

export interface KametiContribution {
  id: string;
  memberId: string;
  periodId: string;
  amount: string;
  paymentMethod?: string;
  referenceNumber?: string;
  status: 'PAID' | 'VERIFIED' | 'PENDING';
  createdAt: string;
}

export interface KametiPayout {
  id: string;
  memberId: string;
  periodId: string;
  amount: string;
  status: string;
  referenceNumber?: string;
  createdAt: string;
}

// ---- Messaging ----

export type ConversationType = 'DIRECT' | 'GROUP' | 'ORDER' | 'KAMETI' | 'PROJECT';

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  memberCount: number;
  lastMessage?: Message;
  otherMemberId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE';
  attachmentUrl?: string;
  createdAt: string;
}

// ---- Services ----

export type ServiceRequestStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

export interface ServiceCategory {
  id: string;
  name: string;
}

export interface ServiceListing {
  id: string;
  providerId: string;
  providerName: string;
  categoryId?: string;
  title: string;
  description?: string;
  price: string;
  contactName?: string;
  contactPhone?: string;
  location?: string;
  availability?: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  requesterId: string;
  serviceId: string;
  description?: string;
  status: ServiceRequestStatus;
  createdAt: string;
}

// ---- Zakat ----

export interface ZakatMethodology {
  nisabBasis: string;
  rates: Record<string, string>;
  eligibleAssets: string[];
  nonEligibleAssets: string[];
  steps: string[];
  scholarlyNotes: string[];
  disclaimers: string[];
}

export interface ZakatCalculation {
  totalAssets: string;
  totalLiabilities: string;
  netWorthy: string;
  nisabThreshold: string;
  zakatDue: string;
  zakatRate: string;
  breakdown: Record<string, string>;
}

// ---- Crowdfunding ----

export type ProjectType = 'DONATION' | 'INVESTMENT';

export interface CrowdfundingProject {
  id: string;
  communityId: string;
  title: string;
  description?: string;
  projectType: ProjectType;
  goalAmount: string;
  raisedAmount: string;
  startDate?: string;
  endDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
  contractType?: string;
  riskDisclosure?: string;
  expectedReturns?: string;
  investmentThesis?: string;
  shariahReviewStatus?: string;
  legalStatus?: string;
  legalGatePassed?: string;
  createdAt: string;
}

export interface CrowdfundingContribution {
  id: string;
  projectId: string;
  userId: string;
  amount: string;
  paymentMethod?: string;
  referenceNumber?: string;
  status: 'REPORTED' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
}

// ---- Finance ----

export type FinanceContractType = 'QARD_HASAN' | 'MUDARABAH' | 'MUSHARAKAH' | 'MURABAHAH' | 'IJARAH';
export type ShariahReviewStatus = 'PENDING_REVIEW' | 'REVIEWED' | 'NEEDS_REVISION';
export type LegalStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED_FOR_DISPLAY' | 'APPROVED_FOR_EXECUTION' | 'BLOCKED' | 'ARCHIVED';
export type ContractStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'NEEDS_REVISION';

export interface FinanceContract {
  id: string;
  communityId: string;
  contractType: FinanceContractType;
  title: string;
  description?: string;
  principalAmount: string;
  currency: string;
  status: ContractStatus;
  shariahReviewStatus: ShariahReviewStatus;
  legalStatus: LegalStatus;
  executionApproved: 'YES' | 'NO';
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

// ---- Kameti Report ----

export interface KametiReport {
  group: KametiGroup;
  summary: {
    totalMembers: number;
    activeMembers: number;
    totalPeriods: number;
    completedPeriods: number;
    totalContributions: string;
    totalPayouts: string;
    balance: string;
  };
  members: KametiMember[];
  periods: KametiPeriod[];
  contributions: KametiContribution[];
  payouts: KametiPayout[];
}

// ---- Crowdfunding Report ----

export interface CrowdfundingReport {
  project: CrowdfundingProject;
  summary: {
    totalContributions: number;
    verifiedContributions: number;
    totalVerified: string;
    totalPending: string;
    raisedAmount: string;
    goalAmount: string;
    progressPercent: number;
    remainingAmount: string;
  };
  contributions: CrowdfundingContribution[];
}

// ---- Finance Contract Detail ----

export interface FinanceContractDetail extends FinanceContract {
  participants: FinanceParticipant[];
  transactions: FinanceTransaction[];
  documents: FinanceDocument[];
  reviews: FinanceReview[];
  repaymentSummary?: {
    principalAmount: string;
    totalRepaid: string;
    remainingBalance: string;
    repaymentCount: number;
  };
}

export interface FinanceParticipant {
  id: string;
  userId: string;
  participantRole: 'LENDER' | 'BORROWER';
  contributionAmount?: string;
}

export interface FinanceTransaction {
  id: string;
  transactionType: string;
  amount: string;
  reference?: string;
  paymentMethod?: string;
  status: string;
  createdAt: string;
}

export interface FinanceDocument {
  id: string;
  documentType: string;
  fileUrl: string;
  createdAt: string;
}

export interface FinanceReview {
  id: string;
  reviewer: string;
  status: string;
  comments?: string;
  createdAt: string;
}

// ---- Subscriptions ----

export interface Subscription {
  id: string;
  communityId: string;
  communityName: string;
  planName: string;
  amount: string;
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  createdAt: string;
}

// ---- Risk Flags ----

export interface RiskFlag {
  id: string;
  communityId: string | null;
  entityType: string;
  entityId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  status: 'FLAGGED' | 'UNDER_REVIEW' | 'CONFIRMED' | 'DISMISSED';
  reviewerId: string | null;
  notes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  [key: string]: unknown;
}

// ---- Shariah Reviews ----

export interface ShariahReview {
  id: string;
  contractId: string;
  reviewer: string;
  status: 'PENDING_REVIEW' | 'REVIEWED' | 'NEEDS_REVISION' | 'ARCHIVED';
  comments: string | null;
  reviewedAt: string | null;
  version: number;
  createdAt: string;
  [key: string]: unknown;
}

// ---- Shared response wrapper ----

export type ApiResponse<T> = { data: T };
