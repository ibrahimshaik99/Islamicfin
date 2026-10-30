import type { Conversation, Message } from '../../lib/types';

/** Human label per conversation type. */
export const TYPE_LABELS: Record<string, string> = {
  DIRECT: 'Direct',
  GROUP: 'Group',
  ORDER: 'Order Chat',
  KAMETI: 'Kameti',
  PROJECT: 'Project',
};

/** Display name for a conversation (backend supplies other-member / kameti names). */
export function conversationTitle(c?: Conversation | null): string {
  if (!c) return 'Conversation';
  if (c.name && !TYPE_LABELS[c.name]) return c.name;
  return TYPE_LABELS[c.type] || c.type;
}

/** Short, relative timestamp for inbox rows (WhatsApp-style). */
export function shortTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/** Clock time for a message bubble footer. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Day key used to group messages under date separators. */
export function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

/** Human label for a date separator (Today / Yesterday / date). */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

/**
 * Index of each message id in the loaded (chronological) list.
 * Used to translate another member's lastReadMessageId into a read position.
 */
export function buildMessageIndex(messages: Message[]): Map<string, number> {
  const map = new Map<string, number>();
  messages.forEach((m, i) => map.set(m.id, i));
  return map;
}

/** Preview text for an inbox row. */
export function messagePreview(m: Message | undefined, isMine = false): string {
  if (!m) return 'No messages yet';
  const prefix = isMine ? 'You: ' : '';
  if (m.messageType === 'IMAGE') return `${prefix}📷 Photo`;
  return `${prefix}${m.body}`;
}
