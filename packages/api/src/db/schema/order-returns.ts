import { pgTable, uuid, varchar, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';
import { orders } from './orders';
import { merchants } from './merchants';

export const returnStatusEnum = pgEnum('return_status', [
  'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED',
]);

export const orderReturns = pgTable('order_returns', {
  id:            uuid('id').primaryKey().defaultRandom(),
  communityId:   uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  orderId:       uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  customerId:    uuid('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  merchantId:    uuid('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  reason:        text('reason').notNull(),
  status:        returnStatusEnum('status').notNull().default('PENDING'),
  adminNotes:    text('admin_notes'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  order_returns_community_id_idx: index().on(table.communityId),
  order_returns_order_id_idx:     index().on(table.orderId),
  order_returns_customer_id_idx:  index().on(table.customerId),
  order_returns_merchant_id_idx:  index().on(table.merchantId),
  order_returns_status_idx:       index().on(table.status),
}));
