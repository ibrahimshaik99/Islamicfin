import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'ACTIVE',
  'PAST_DUE',
  'CANCELLED',
  'TRIALING',
]);

export const billingPeriodEnum = pgEnum('billing_period', ['MONTHLY', 'YEARLY']);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    plan: varchar('plan', { length: 100 }).notNull().default('standard'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    billingPeriod: billingPeriodEnum('billing_period').notNull().default('MONTHLY'),
    status: subscriptionStatusEnum('status').notNull().default('ACTIVE'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    subscriptions_community_id_idx: index('subscriptions_community_id_idx').on(table.communityId),
    subscriptions_status_idx: index('subscriptions_status_idx').on(table.status),
  }),
);
