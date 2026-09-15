import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const communityGroupStatusEnum = pgEnum('community_group_status', [
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
]);

export const communityGroups = pgTable(
  'community_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    status: communityGroupStatusEnum('status').notNull().default('ACTIVE'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    community_groups_community_id_idx: index('community_groups_community_id_idx').on(table.communityId),
    community_groups_status_idx: index('community_groups_status_idx').on(table.status),
    community_groups_created_by_idx: index('community_groups_created_by_idx').on(table.createdBy),
  }),
);

export const communityGroupMemberStatusEnum = pgEnum('community_group_member_status', [
  'ACTIVE',
  'REMOVED',
]);

export const communityGroupMembers = pgTable(
  'community_group_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => communityGroups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: communityGroupMemberStatusEnum('status').notNull().default('ACTIVE'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    community_group_members_group_id_idx: index('community_group_members_group_id_idx').on(table.groupId),
    community_group_members_user_id_idx: index('community_group_members_user_id_idx').on(table.userId),
  }),
);

export const announcementStatusEnum = pgEnum('announcement_status', [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]);

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    status: announcementStatusEnum('status').notNull().default('DRAFT'),
    audience: varchar('audience', { length: 50 }).notNull().default('ALL'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    announcements_community_id_idx: index('announcements_community_id_idx').on(table.communityId),
    announcements_status_idx: index('announcements_status_idx').on(table.status),
    announcements_created_by_idx: index('announcements_created_by_idx').on(table.createdBy),
  }),
);
