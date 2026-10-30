import { useMemo, useState } from 'react';
import type { Conversation } from '../../lib/types';
import { LoadingSkeleton, EmptyStateCard } from '../ui';
import { ChatListItem } from './ChatListItem';
import { conversationTitle } from './chatUtils';

/**
 * Inbox panel: search + filter tabs + conversation list.
 *
 * Tabs map to real server data: Unread uses the server-computed unreadCount,
 * Personal = DIRECT conversations, Group = GROUP/ORDER/KAMETI/PROJECT.
 * An "Archived" tab is intentionally omitted — the backend has no archive
 * concept and a fake tab would be misleading.
 */
export type InboxTab = 'all' | 'unread' | 'personal' | 'group';

const TABS: { id: InboxTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'personal', label: 'Personal' },
  { id: 'group', label: 'Groups' },
];

export function ChatInbox({
  conversations,
  loading,
  error,
  selectedId,
  currentUserId,
  onSelect,
  onNewChat,
  onRetry,
  title = 'Messages',
}: {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  currentUserId?: string;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
  onRetry?: () => void;
  title?: string;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<InboxTab>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      const unread = (c as Conversation & { unreadCount?: number }).unreadCount ?? 0;
      if (tab === 'unread' && unread === 0) return false;
      if (tab === 'personal' && c.type !== 'DIRECT') return false;
      if (tab === 'group' && c.type === 'DIRECT') return false;
      if (!q) return true;
      const haystack = [
        conversationTitle(c),
        c.lastMessage?.body ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [conversations, search, tab]);

  const totalUnread = conversations.reduce(
    (acc, c) => acc + ((c as Conversation & { unreadCount?: number }).unreadCount ?? 0),
    0,
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-line min-h-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-line flex-shrink-0 safe-top">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-ink">{title}</h1>
            {totalUnread > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-600 text-white text-[11px] font-bold flex items-center justify-center">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          {onNewChat && (
            <button
              type="button"
              onClick={onNewChat}
              aria-label="Start a new chat"
              className="touch-target h-9 w-9 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            aria-label="Search conversations"
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-line rounded-xl text-ink placeholder:text-muted focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15 transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 pb-1 overflow-x-auto hide-scrollbar" role="tablist" aria-label="Conversation filters">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface text-muted border border-line hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto chat-scroll min-h-0">
        {loading && conversations.length === 0 && (
          <div className="p-4">
            <LoadingSkeleton rows={5} />
          </div>
        )}
        {error && (
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-sm text-red-700 font-medium">Could not load conversations</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <EmptyStateCard
            title={search || tab !== 'all' ? 'No matching conversations' : 'No conversations yet'}
            description={
              search || tab !== 'all'
                ? 'Try a different search or filter.'
                : 'Start a chat from the marketplace, community or Kameti pages — or tap + to message a member.'
            }
            action={
              onNewChat && !search && tab === 'all' ? (
                <button
                  type="button"
                  onClick={onNewChat}
                  className="inline-flex px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  New chat
                </button>
              ) : undefined
            }
          />
        )}
        {filtered.map((c) => (
          <ChatListItem
            key={c.id}
            conversation={c}
            currentUserId={currentUserId}
            selected={c.id === selectedId}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>
    </div>
  );
}
