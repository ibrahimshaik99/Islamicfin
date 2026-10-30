import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

/**
 * Notification bell + dropdown.
 *
 * Backed by the real /api/v1/notifications routes (user-scoped). Every item is
 * actionable: clicking marks it read and navigates to its target route.
 */

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

/** Where each notification type leads when tapped. */
function targetFor(n: NotificationItem): string | null {
  const data = n.data || {};
  switch (n.type) {
    case 'MEMBERSHIP_REQUEST_DECISION':
      return '/app';
    case 'BNPL_CONTRACT_REVIEWED':
      return typeof data.contractId === 'string' ? `/app/bnpl/${data.contractId}` : '/app/bnpl';
    default:
      return null;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: NotificationItem[]; unreadCount: number }>(
        '/notifications?limit=20',
      );
      setItems(res.data ?? []);
      setUnreadCount(res.unreadCount ?? 0);
    } catch {
      // Non-critical: bell simply shows no notifications on failure.
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + poll while the dropdown is closed (cheap, user-scoped).
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!open) load();
    }, 30000);
    return () => clearInterval(id);
  }, [load, open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markRead = async (n: NotificationItem) => {
    if (n.readAt) return;
    // Optimistic update; roll back on failure.
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api(`/notifications/${n.id}/read`, { method: 'POST' });
    } catch {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: null } : x)));
      setUnreadCount((c) => c + 1);
    }
  };

  const handleOpenItem = async (n: NotificationItem) => {
    await markRead(n);
    setOpen(false);
    const target = targetFor(n);
    if (target) navigate(target);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await api('/notifications/read-all', { method: 'POST' });
    } catch {
      load();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="relative h-10 w-10 rounded-xl bg-white border border-line text-ink flex items-center justify-center shadow-card hover:bg-surface transition-colors touch-target"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-line shadow-soft overflow-hidden z-50 animate-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <h4 className="text-sm font-bold text-ink">Notifications</h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="p-4 space-y-3 animate-pulse">
                <div className="h-3 bg-line rounded-full w-2/3" />
                <div className="h-3 bg-line rounded-full w-1/2" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-ink">No notifications yet</p>
                <p className="text-xs text-muted mt-1">Updates about your community will appear here.</p>
              </div>
            )}

            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleOpenItem(n)}
                className={`w-full text-left px-4 py-3 border-b border-line last:border-0 hover:bg-surface transition-colors ${
                  n.readAt ? '' : 'bg-primary-50/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {!n.readAt && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-600 flex-shrink-0" />}
                  <div className={n.readAt ? 'pl-[14px]' : 'min-w-0'}>
                    <p className="text-sm font-semibold text-ink leading-snug">{n.title}</p>
                    {n.body && <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted/70 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
