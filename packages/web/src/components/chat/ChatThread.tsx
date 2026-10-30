import { useEffect, useRef } from 'react';
import type { Message } from '../../lib/types';
import { UserAvatar } from '../ui';
import { MessageBubble, DateSeparator, useReadReceipts, markConversationRead } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { conversationTitle, dayKey, dayLabel } from './chatUtils';

/**
 * Full chat thread panel: header, date-separated bubbles, composer.
 *
 * - Marks the conversation read on open/arrival (drives the inbox badge).
 * - Read receipts on own messages come from real last-read tracking.
 * - Typing indicators and reactions are intentionally NOT rendered: the
 *   backend has no presence/typing/reaction model.
 */
export function ChatThread({
  communityId,
  conversationId,
  title,
  subtitle,
  memberCount,
  type,
  messages,
  loading,
  error,
  currentUserId,
  onBack,
  onSend,
  onSendImage,
  imagePreview,
  onFileSelected,
  onClearImage,
  headerAction,
}: {
  communityId: string | null;
  conversationId: string;
  title: string;
  subtitle?: string;
  memberCount?: number;
  type?: string;
  messages: Message[];
  loading: boolean;
  error: string | null;
  currentUserId?: string;
  onBack?: () => void;
  onSend: (body: string) => void;
  onSendImage?: (dataUrl: string) => void;
  imagePreview?: string | null;
  onFileSelected?: (dataUrl: string) => void;
  onClearImage?: () => void;
  /** Extra button in the header (e.g. group info). */
  headerAction?: React.ReactNode;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const read = useReadReceipts(communityId, conversationId, messages, currentUserId);

  // Mark read whenever new messages arrive while the thread is open.
  useEffect(() => {
    if (!communityId || !conversationId) return;
    const last = messages[messages.length - 1];
    if (last && last.senderId !== currentUserId) {
      markConversationRead(communityId, conversationId);
    }
  }, [communityId, conversationId, messages, currentUserId]);

  // Auto-scroll to newest.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Group by day → render date separators.
  const rows: React.ReactNode[] = [];
  let lastDay = '';
  for (const m of messages) {
    const key = dayKey(m.createdAt);
    if (key !== lastDay) {
      lastDay = key;
      rows.push(<DateSeparator key={`d-${key}`} label={dayLabel(m.createdAt)} />);
    }
    const isMine = m.senderId === currentUserId;
    const isGroup = type !== 'DIRECT';
    rows.push(
      <MessageBubble
        key={m.id}
        message={m}
        isMine={isMine}
        showSender={isGroup && !isMine}
        showReceipt={isMine}
        read={read.isRead(m.id)}
      />,
    );
  }

  const subtitleText =
    subtitle ??
    (type === 'DIRECT'
      ? 'Personal chat'
      : memberCount
        ? `${memberCount} member${memberCount !== 1 ? 's' : ''}`
        : type);

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-line flex-shrink-0 safe-top">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to inbox"
            className="touch-target -ml-2 flex items-center justify-center rounded-xl hover:bg-surface transition-colors"
          >
            <svg className="h-5 w-5 text-ink" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        <UserAvatar name={title} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink truncate">{title}</p>
          {/* Presence is only shown when the backend supports it — it does not yet. */}
          <p className="text-[11px] text-muted truncate">{subtitleText}</p>
        </div>
        {headerAction}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-3 space-y-2">
        {loading && messages.length === 0 && (
          <div className="space-y-3 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'} animate-pulse`}>
                <div className={`h-10 ${i % 2 ? 'w-32 bg-primary-100' : 'w-40 bg-white'} rounded-2xl border border-line`} />
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="mx-auto max-w-sm bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2 text-center">
            {error}
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-500 flex items-center justify-center mb-3">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-ink">No messages yet</p>
            <p className="text-xs text-muted mt-1">Send the first message to start the conversation.</p>
          </div>
        )}
        {rows}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <MessageComposer
        onSend={onSend}
        onSendImage={onSendImage}
        onFileSelected={onFileSelected}
        imagePreview={imagePreview}
        onClearImage={onClearImage}
      />
    </div>
  );
}

/** Empty state shown when no conversation is selected (desktop split view). */
export function ChatThreadPlaceholder() {
  return (
    <div className="flex-1 hidden md:flex items-center justify-center bg-surface">
      <div className="text-center">
        <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-500 flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-ink">Select a conversation</p>
        <p className="text-xs text-muted mt-1">Choose from the list to start chatting.</p>
      </div>
    </div>
  );
}

export { conversationTitle };
