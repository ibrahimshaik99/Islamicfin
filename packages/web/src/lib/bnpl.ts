// Shared types + helpers for the Shariah-reviewed deferred payment (BNPL) feature.
// All money values are decimal strings from the API — never do float math on them here.

export type BnplContractStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type BnplFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type BnplInstallmentStatus = 'PENDING' | 'PAID' | 'VERIFIED' | 'OVERDUE' | 'WAIVED';

export interface BnplInstallment {
  id: string;
  contractId: string;
  installmentNumber: number;
  dueDate: string;
  amount: string;
  status: BnplInstallmentStatus;
  paidAt: string | null;
  paymentMethod: string | null;
  referenceNumber: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
}

export interface BnplContract {
  id: string;
  communityId: string;
  orderId: string;
  customerId: string;
  merchantId: string;
  purchasePrice: string;
  totalSalePrice: string;
  downPayment: string;
  installmentAmount: string;
  installmentCount: number;
  installmentFrequency: BnplFrequency;
  startDate: string;
  firstDueDate: string;
  totalAmountPayable: string;
  status: BnplContractStatus;
  shariahReviewStatus: string;
  contractTerms: string | null;
  reviewComments: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  installmentProgress?: {
    total: number;
    paid: number;
    paidAmount: string;
    nextDueDate: string | null;
    nextDueAmount: string | null;
  };
}

export interface BnplContractDetail extends BnplContract {
  order: {
    id: string;
    orderNumber: string;
    total: string;
    orderStatus: string;
    paymentStatus: string;
  } | null;
  installments: BnplInstallment[];
}

export const BNPL_STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export const INSTALLMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  PAID: 'bg-amber-100 text-amber-700',
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
  WAIVED: 'bg-blue-100 text-blue-700',
};

/** Format a decimal money string for display (INR, no float math beyond display). */
export function formatMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Days from today until a YYYY-MM-DD date (negative = past). */
export function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function toDateInputDefault(daysFromNow = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
