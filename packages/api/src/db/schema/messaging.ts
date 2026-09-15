import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const conversationTypeEnum = pgEnum('conversation_type', [
  'DIRECT',
  'GROUP',
  'ORDER',
  'KAMETI',
  'PROJECT',
]);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    type: conversationTypeEnum('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversations_community_id_idx: index('conversations_community_id_idx').on(table.communityId),
    conversations_type_idx: index('conversations_type_idx').on(table.type),
  }),
);

export const conversationMembers = pgTable(
  'conversation_members',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    lastReadMessageId: uuid('last_read_message_id'),
  },
  (table) => ({
    conversation_members_conversation_user_idx: uniqueIndex('conversation_members_conversation_user_idx').on(
      table.conversationId,
      table.userId,
    ),
    conversation_members_user_id_idx: index('conversation_members_user_id_idx').on(table.userId),
  }),
);

export const messageTypeEnum = pgEnum('message_type', [
  'TEXT',
  'IMAGE',
  'FILE',
  'SYSTEM',
]);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    messageType: messageTypeEnum('message_type').notNull().default('TEXT'),
    body: text('body').notNull(),
    attachmentUrl: text('attachment_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    messages_conversation_id_idx: index('messages_conversation_id_idx').on(table.conversationId),
    messages_sender_id_idx: index('messages_sender_id_idx').on(table.senderId),
    messages_created_at_idx: index('messages_created_at_idx').on(table.createdAt),
  }),
);
