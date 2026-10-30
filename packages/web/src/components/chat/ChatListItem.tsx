import type { Conversation } from '../../lib/types';
import { UserAvatar, UnreadBadge } from '../ui';
import { conversationTitle, shortTime, messagePreview } from './chatUtils';

/**
 * Inbox conversation row.
 *
 * Unread count comes from the server-computed `unreadCount` (read-receipt
 * based). No presence/online dot: the backend does not track presence.
 */
export function ChatListItem({
  conversation,
  currentUserId,
  selected = false,
  onClick,
}: {
  conversation: Conversation;
  currentUserId?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  const title = conversationTitle(conversation);
  const unread = (conversation as Conversation & { unreadCount?: number }).unreadCount ?? 0;
  const isMine = conversation.lastMessage?.senderId === currentUserId;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-line last:border-0 transition-colors touch-target ${
        selected ? 'bg-primary-50' : 'hover:bg-surface'
      }`}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar name={title} size="md" />
        {conversation.type === 'GROUP' && (
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-gold-500 text-white flex items-center justify-center ring-2 ring-white">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477" />
            </svg>
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm truncate ${
              unread > 0 ? 'font-bold text-ink' : 'font-semibold text-ink'
            }`}
          >
            {title}
          </p>
          {conversation.updatedAt && (
            <span className={`text-[10px] flex-shrink-0 ${unread > 0 ? 'text-primary-600 font-semibold' : 'text-muted'}`}>
              {shortTime(conversation.updatedAt)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={`text-xs truncate ${
              unread > 0 ? 'text-ink font-medium' : 'text-muted'
            }`}
          >
            {messagePreview(conversation.lastMessage, isMine)}
          </p>
          <UnreadBadge count={unread} className="flex-shrink-0" />
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted bg-surface border border-line px-1.5 py-px rounded-full">
            {conversation.type === 'DIRECT' ? 'Personal' : conversation.type}
          </span>
          {conversation.memberCount > 2 && (
            <span className="text-[10px] text-muted">
              {conversation.memberCount} members
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
