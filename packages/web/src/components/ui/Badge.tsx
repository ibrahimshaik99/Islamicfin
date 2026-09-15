import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Status-specific badge helpers
export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    PROCESSING: 'info',
    READY: 'info',
    OUT_FOR_DELIVERY: 'info',
    DELIVERED: 'success',
    CANCELLED: 'danger',
    REJECTED: 'danger',
  };
  return <Badge variant={map[status] || 'default'}>{status.replace(/_/g, ' ')}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    UNPAID: 'warning',
    PAYMENT_REPORTED: 'info',
    PAYMENT_VERIFIED: 'success',
    PAYMENT_REJECTED: 'danger',
  };
  return <Badge variant={map[status] || 'default'}>{status.replace(/_/g, ' ')}</Badge>;
}

export function MerchantStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    SUSPENDED: 'danger',
  };
  return <Badge variant={map[status] || 'default'}>{status}</Badge>;
}

export function ContractStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    DRAFT: 'default',
    PENDING_REVIEW: 'warning',
    ACTIVE: 'success',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    NEEDS_REVISION: 'warning',
  };
  return <Badge variant={map[status] || 'default'}>{status.replace(/_/g, ' ')}</Badge>;
}

export function ShariahReviewBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    PENDING_REVIEW: 'warning',
    REVIEWED: 'success',
    NEEDS_REVISION: 'danger',
  };
  return <Badge variant={map[status] || 'default'}>{status.replace(/_/g, ' ')}</Badge>;
}
