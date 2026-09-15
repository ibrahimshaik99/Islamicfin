import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';
import { merchants } from './merchants';
import { products } from './products';

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'UNPAID',
  'PAYMENT_REPORTED',
  'PAYMENT_VERIFIED',
  'PAYMENT_REJECTED',
  'REFUNDED',
  'NOT_REQUIRED',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'COD',
  'DIRECT_UPI',
]);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    orderNumber: varchar('order_number', { length: 50 }).notNull(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    deliveryFee: numeric('delivery_fee', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('UNPAID'),
    orderStatus: orderStatusEnum('order_status').notNull().default('PENDING'),
    shippingAddress: text('shipping_address'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orders_community_order_number_idx: uniqueIndex('orders_community_order_number_idx').on(table.communityId, table.orderNumber),
    orders_community_id_idx: index('orders_community_id_idx').on(table.communityId),
    orders_customer_id_idx: index('orders_customer_id_idx').on(table.customerId),
    orders_merchant_id_idx: index('orders_merchant_id_idx').on(table.merchantId),
    orders_order_status_idx: index('orders_order_status_idx').on(table.orderStatus),
    orders_payment_status_idx: index('orders_payment_status_idx').on(table.paymentStatus),
    orders_created_at_idx: index('orders_created_at_idx').on(table.createdAt),
  }),
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    order_items_order_id_idx: index('order_items_order_id_idx').on(table.orderId),
  }),
);

export const paymentRecordStatusEnum = pgEnum('payment_record_status', [
  'REPORTED',
  'VERIFIED',
  'REJECTED',
  'NOT_REQUIRED',
]);

export const paymentRecords = pgTable(
  'payment_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    referenceNumber: varchar('reference_number', { length: 255 }),
    proofUrl: text('proof_url'),
    status: paymentRecordStatusEnum('status').notNull().default('REPORTED'),
    reportedBy: uuid('reported_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    verifiedBy: uuid('verified_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    payment_records_community_id_idx: index('payment_records_community_id_idx').on(table.communityId),
    payment_records_order_id_idx: index('payment_records_order_id_idx').on(table.orderId),
    payment_records_status_idx: index('payment_records_status_idx').on(table.status),
  }),
);
