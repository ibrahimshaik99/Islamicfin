import { pgTable, uuid, varchar, text, timestamp, index, pgEnum, numeric } from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const financeRequestTypeEnum = pgEnum('finance_request_type', [
  'INVESTMENT', 'LOAN', 'DONATION', 'PARTNERSHIP',
]);

export const financeRequestStatusEnum = pgEnum('finance_request_status', [
  'PENDING', 'CONTACTED', 'CLOSED',
]);

export const financeRequests = pgTable('finance_requests', {
  id:            uuid('id').primaryKey().defaultRandom(),
  communityId:   uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  userId:        uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requestType:   financeRequestTypeEnum('request_type').notNull(),
  amount:        numeric('amount', { precision: 12, scale: 2 }),
  description:   text('description').notNull(),
  contactPhone:  varchar('contact_phone', { length: 20 }),
  status:        financeRequestStatusEnum('status').notNull().default('PENDING'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  finance_requests_community_id_idx: index().on(table.communityId),
  finance_requests_user_id_idx:      index().on(table.userId),
  finance_requests_request_type_idx: index().on(table.requestType),
  finance_requests_status_idx:       index().on(table.status),
}));
