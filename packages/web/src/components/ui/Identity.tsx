import { ReactNode } from 'react';

/**
 * Barakah shared identity components.
 * All sizes use the design-system spacing scale and Barakah palette.
 */

/** Deterministic tinted avatar for users without a photo. */
const TINTS = [
  'bg-primary-100 text-primary-700',
  'bg-gold-100 text-gold-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-800',
];

function tintFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function UserAvatar({
  name,
  src,
  size = 'md',
  online,
  className = '',
}: {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Renders the online dot only when the backend supports presence. */
  online?: boolean;
  className?: string;
}) {
  const sizePx = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  }[size];

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizePx} rounded-full object-cover ring-1 ring-line`}
        />
      ) : (
        <div
          className={`${sizePx} rounded-full flex items-center justify-center font-semibold ring-1 ring-white ${tintFor(name || '?')}`}
          aria-hidden="true"
        >
          {(name || '?').trim().charAt(0).toUpperCase()}
        </div>
      )}
      {online !== undefined && <OnlineStatus online={online} />}
    </div>
  );
}

/** Green presence dot. Only render when the backend reports presence. */
export function OnlineStatus({ online, size = 'md' }: { online: boolean; size?: 'sm' | 'md' }) {
  const dot = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';
  const ring = size === 'sm' ? 'ring-2' : 'ring-[2.5px]';
  return (
    <span
      className={`absolute bottom-0 right-0 ${dot} rounded-full ${
        online ? 'bg-green-500' : 'bg-gray-300'
      } ${ring} ring-white`}
      title={online ? 'Online' : 'Offline'}
      aria-label={online ? 'Online' : 'Offline'}
    />
  );
}

/** Unread counter pill (chat + notifications). */
export function UnreadBadge({
  count,
  className = '',
}: {
  count: number;
  className?: string;
}) {
  if (!count) return null;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-600 text-white text-[10px] font-bold leading-none ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Typing indicator (three bouncing dots). */
export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5" aria-label={name ? `${name} is typing` : 'Typing'}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
        />
      ))}
    </div>
  );
}

/** Skeleton loader for lists/chat. */
export function LoadingSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-11 w-11 rounded-full bg-line/70" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-line/70 rounded-full w-1/3" />
            <div className="h-3 bg-line/50 rounded-full w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Confirmation dialog used for destructive/financial actions. */
export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-soft p-6 safe-bottom animate-in">
        <h3 className="text-base font-bold text-ink">{title}</h3>
        {message && <p className="mt-2 text-sm text-muted leading-relaxed">{message}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-surface transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Standardized empty state (matches Barakah tone). */
export function EmptyStateCard({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-6">
      {icon ? (
        <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-500 flex items-center justify-center mb-4">{icon}</div>
      ) : (
        <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-400 flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-muted max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
