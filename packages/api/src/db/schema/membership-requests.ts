import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { communities } from './communities';

export const membershipRequests = pgTable(
  'membership_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    communityId: uuid('community_id')
      .references(() => communities.id, { onDelete: 'cascade' }),
    requestType: varchar('request_type', { length: 50 }).notNull().default('JOIN_COMMUNITY'),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'),
    communityName: varchar('community_name', { length: 255 }),
    communitySlug: varchar('community_slug', { length: 255 }),
    message: text('message'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    membership_requests_status_idx: index('membership_requests_status_idx').on(table.status),
    membership_requests_user_id_idx: index('membership_requests_user_id_idx').on(table.userId),
    membership_requests_community_id_idx: index('membership_requests_community_id_idx').on(table.communityId),
    membership_requests_type_idx: index('membership_requests_type_idx').on(table.requestType),
  }),
);
