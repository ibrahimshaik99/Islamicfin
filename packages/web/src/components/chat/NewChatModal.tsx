import { useState } from 'react';
import { UserAvatar, LoadingSkeleton } from '../ui';

interface MemberLike {
  id: string;
  userId?: string;
  name?: string;
  userName?: string;
  email?: string;
  userEmail?: string;
  phone?: string;
  role?: string;
}

/**
 * "New chat" member picker. Members come from the tenant-scoped
 * /communities/:id/members endpoint (community:read).
 */
export function NewChatModal({
  members,
  loading,
  currentUserId,
  onSelect,
  onClose,
}: {
  members: MemberLike[];
  loading: boolean;
  currentUserId?: string;
  /** Receives the target user's id. */
  onSelect: (userId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const candidates = members.filter((m) => (m.userId || m.id) !== currentUserId);
  const filtered = candidates.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [m.userName || m.name, m.userEmail || m.email, m.phone]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-[2px] animate-in"
      role="dialog"
      aria-modal="true"
      aria-label="Start a new chat"
    >
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-soft max-h-[85vh] flex flex-col safe-bottom">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line">
          <div>
            <h3 className="text-base font-bold text-ink">New chat</h3>
            <p className="text-xs text-muted mt-0.5">Select a community member to message</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="touch-target -mr-2 flex items-center justify-center rounded-xl hover:bg-surface transition-colors"
          >
            <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-3 border-b border-line">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            aria-label="Search members"
            autoFocus
            className="w-full px-4 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink placeholder:text-muted focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto chat-scroll">
          {loading && (
            <div className="p-4">
              <LoadingSkeleton rows={4} />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted text-center py-10">No members found</p>
          )}
          {filtered.map((m) => {
            const name = m.userName || m.name || 'Member';
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.userId || m.id)}
                className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-surface border-b border-line last:border-0 transition-colors touch-target"
              >
                <UserAvatar name={name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{name}</p>
                  <p className="text-xs text-muted truncate">{m.userEmail || m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                </div>
                {m.role && (
                  <span className="text-[10px] text-muted bg-surface border border-line px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {m.role.replace('COMMUNITY_', '')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
