import { useMemo } from 'react';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import type { Message } from '../../lib/types';
import { clockTime } from './chatUtils';

/**
 * Read-receipt computation backed by real data.
 *
 * `GET /conversations/:id` returns members with `lastReadMessageId`. We map
 * each other member's last-read position onto the loaded message list, so a
 * sent bubble can show "Delivered" → "Read" truthfully.
 */

interface ConversationMember {
  userId: string;
  name: string;
  lastReadMessageId: string | null;
}

export interface ReadState {
  /** Whether the given message (mine) has been read by the recipient(s). */
  isRead: (messageId: string) => boolean;
  /** Number of other members who have read the latest of my messages. */
  seenByCount: number;
  /** Number of other members in the conversation. */
  otherMemberCount: number;
}

export function useReadReceipts(
  communityId: string | null,
  conversationId: string | null,
  messages: Message[],
  currentUserId?: string,
): ReadState {
  const prefix = communityId ? `/communities/${communityId}` : '';
  const { data } = useApi<{ members?: ConversationMember[] }>(
    communityId && conversationId ? `${prefix}/conversations/${conversationId}` : null,
  );

  const members = data?.members ?? [];

  const { readSet, others } = useMemo(() => {
    const indexById = new Map(messages.map((m, i) => [m.id, i] as const));
    const set = new Set<string>();
    let otherCount = 0;
    for (const m of members) {
      if (m.userId === currentUserId) continue;
      otherCount += 1;
      const readIndex = m.lastReadMessageId ? indexById.get(m.lastReadMessageId) : undefined;
      if (readIndex === undefined) continue; // Outside loaded window → treat as not read
      for (let i = 0; i <= readIndex; i++) set.add(messages[i].id);
    }
    return { readSet: set, others: otherCount };
  }, [members, messages, currentUserId]);

  // Seen-by count: other members whose last-read position reaches my newest message.
  const seenByCount = useMemo(() => {
    const myLastIndex = messages.reduce((acc, m, i) => (m.senderId === currentUserId ? i : acc), -1);
    if (myLastIndex < 0) return 0;
    const indexById = new Map(messages.map((m, i) => [m.id, i] as const));
    let seen = 0;
    for (const m of members) {
      if (m.userId === currentUserId) continue;
      const readIndex = m.lastReadMessageId ? indexById.get(m.lastReadMessageId) : undefined;
      if (readIndex !== undefined && readIndex >= myLastIndex) seen += 1;
    }
    return seen;
  }, [members, messages, currentUserId]);

  return {
    isRead: (messageId: string) => readSet.has(messageId),
    seenByCount,
    otherMemberCount: others,
  };
}

/** Mark the conversation read server-side (updates unread counts everywhere). */
export async function markConversationRead(
  communityId: string,
  conversationId: string,
): Promise<void> {
  try {
    await api(`/communities/${communityId}/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  } catch {
    // Non-fatal: unread badge simply persists until the next successful read.
  }
}

/** Double-check read receipt glyph for own messages. */
export function ReadReceipt({ read }: { read: boolean }) {
  return (
    <span
      className={`inline-flex items-center ${read ? 'text-primary-300' : 'text-white/50'}`}
      title={read ? 'Read' : 'Delivered'}
      aria-label={read ? 'Read' : 'Delivered'}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
        {read ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l4.5 4.5 10.5-10.5" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        )}
      </svg>
    </span>
  );
}

/** Date separator line between message groups. */
export function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2" aria-label={label}>
      <div className="flex-1 h-px bg-line" />
      <span className="text-[10px] font-semibold text-muted bg-white px-2 py-0.5 rounded-full border border-line">
        {label}
      </span>
      <div className="flex-1 h-px bg-line" />
    </div>
  );
}

/**
 * Chat message bubble.
 *
 * Read receipts render ONLY for the sender's own messages and only when the
 * server tracks last-read positions. Reactions/replies are intentionally
 * absent: the backend has no reaction/reply model yet.
 */
export function MessageBubble({
  message,
  isMine,
  showSender,
  read,
  showReceipt = false,
}: {
  message: Message;
  isMine: boolean;
  /** Sender name line (group chats only). */
  showSender?: boolean;
  /** Read state (own messages only). */
  read?: boolean;
  /** Whether to render the read-receipt glyph (own messages only). */
  showReceipt?: boolean;
}) {
  const isImage = message.messageType === 'IMAGE' && message.attachmentUrl;

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[82%] sm:max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {showSender && !isMine && (
          <p className="text-[10px] font-semibold text-primary-600 mb-1 ml-1">{message.senderName || 'Member'}</p>
        )}

        <div
          className={`px-3.5 py-2.5 rounded-2xl ${
            isMine
              ? 'bg-primary-600 text-white rounded-br-md shadow-card'
              : 'bg-white text-ink border border-line rounded-bl-md shadow-card'
          }`}
        >
          {isImage && (
            <img
              src={message.attachmentUrl}
              alt="Attachment"
              className="max-h-64 rounded-xl mb-1.5 object-cover"
              loading="lazy"
            />
          )}
          {message.body && message.body !== 'Photo' && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
          )}
          {message.messageType === 'IMAGE' && message.body === 'Photo' && !message.attachmentUrl && (
            <p className="text-sm italic opacity-70">Photo</p>
          )}

          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
            <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-muted'}`}>
              {clockTime(message.createdAt)}
            </span>
            {message.editedAt && (
              <span className={`text-[10px] ${isMine ? 'text-white/50' : 'text-muted/70'}`}>· edited</span>
            )}
            {isMine && showReceipt && <ReadReceipt read={!!read} />}
          </div>
        </div>
      </div>
    </div>
  );
}
