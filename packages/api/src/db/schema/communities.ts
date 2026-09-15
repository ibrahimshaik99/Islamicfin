import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const communityStatusEnum = pgEnum('community_status', [
  'ACTIVE',
  'SUSPENDED',
  'DISABLED',
  'PENDING',
]);

export const communities = pgTable(
  'communities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    logoUrl: text('logo_url'),
    address: text('address'),
    city: varchar('city', { length: 255 }),
    state: varchar('state', { length: 255 }),
    country: varchar('country', { length: 100 }).default('India'),
    contactPhone: varchar('contact_phone', { length: 20 }),
    status: communityStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    communities_status_idx: index('communities_status_idx').on(table.status),
    communities_created_at_idx: index('communities_created_at_idx').on(table.createdAt),
  }),
);

export const communityRoleEnum = pgEnum('community_role', [
  'SUPER_ADMIN',
  'COMMUNITY_OWNER',
  'COMMUNITY_ADMIN',
  'COMMUNITY_MODERATOR',
  'COMMUNITY_FINANCE_MANAGER',
  'MERCHANT',
  'MERCHANT_STAFF',
  'CUSTOMER',
]);

export const membershipStatusEnum = pgEnum('membership_status', [
  'ACTIVE',
  'SUSPENDED',
  'INVITED',
  'LEFT',
]);

export const communityMemberships = pgTable(
  'community_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: communityRoleEnum('role').notNull().default('CUSTOMER'),
    status: membershipStatusEnum('status').notNull().default('ACTIVE'),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    community_memberships_community_user_idx: uniqueIndex('community_memberships_community_user_idx').on(
      table.communityId,
      table.userId,
    ),
    community_memberships_community_id_idx: index('community_memberships_community_id_idx').on(table.communityId),
    community_memberships_user_id_idx: index('community_memberships_user_id_idx').on(table.userId),
    community_memberships_role_idx: index('community_memberships_role_idx').on(table.role),
  }),
);
