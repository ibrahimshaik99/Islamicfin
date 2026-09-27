import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  date,
  timestamp,
  text,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';
import { merchants } from './merchants';
import { orders } from './orders';
import { shariahReviewStatusEnum } from './finance';

/**
 * Deferred-payment (Murabahah-style installment) contracts.
 *
 * IMPORTANT: This models a fixed deferred sale price split into installments.
 * There is NO interest, APR, compounding or late fee anywhere in this schema.
 * `shariahReviewStatus` starts as PENDING_REVIEW and the contract must not be
 * described as Shariah approved until a qualified human reviewer marks it REVIEWED
 * through the project's Shariah review workflow.
 */
export const bnplContractStatusEnum = pgEnum('bnpl_contract_status', [
  'PENDING_REVIEW',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);

export const bnplInstallmentFrequencyEnum = pgEnum('bnpl_installment_frequency', [
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
]);

export const bnplInstallmentStatusEnum = pgEnum('bnpl_installment_status', [
  'PENDING',
  'PAID',
  'VERIFIED',
  'REJECTED',
  'CANCELLED',
]);

export const bnplContracts = pgTable(
  'bnpl_contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    // Snapshot of ordered items at contract creation (informational)
    itemsSnapshot: jsonb('items_snapshot'),
    // Merchant's cost/asset purchase price for the goods (Murabahah asset leg)
    purchasePrice: numeric('purchase_price', { precision: 14, scale: 2 }).notNull(),
    // Fixed total deferred sale price agreed with the customer (principal + disclosed margin
    // already contained in the merchant's listed price). Never recalculated with interest.
    totalSalePrice: numeric('total_sale_price', { precision: 14, scale: 2 }).notNull(),
    downPayment: numeric('down_payment', { precision: 14, scale: 2 }).notNull().default('0'),
    installmentAmount: numeric('installment_amount', { precision: 14, scale: 2 }).notNull(),
    installmentCount: integer('installment_count').notNull(),
    installmentFrequency: bnplInstallmentFrequencyEnum('installment_frequency').notNull(),
    startDate: date('start_date').notNull(),
    firstDueDate: date('first_due_date').notNull(),
    // totalAmountPayable = downPayment + installmentAmount * installmentCount (fixed at creation)
    totalAmountPayable: numeric('total_amount_payable', { precision: 14, scale: 2 }).notNull(),
    status: bnplContractStatusEnum('status').notNull().default('PENDING_REVIEW'),
    shariahReviewStatus: shariahReviewStatusEnum('shariah_review_status')
      .notNull()
      .default('PENDING_REVIEW'),
    reviewComments: text('review_comments'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    contractTerms: text('contract_terms'),
    termsVersion: varchar('terms_version', { length: 20 }).default('1.0'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // One deferred-payment contract per order (prevents duplicate submissions)
    bnpl_contracts_order_idx: uniqueIndex('bnpl_contracts_order_idx').on(table.orderId),
    bnpl_contracts_community_id_idx: index('bnpl_contracts_community_id_idx').on(
      table.communityId,
    ),
    bnpl_contracts_customer_id_idx: index('bnpl_contracts_customer_id_idx').on(table.customerId),
    bnpl_contracts_merchant_id_idx: index('bnpl_contracts_merchant_id_idx').on(table.merchantId),
    bnpl_contracts_status_idx: index('bnpl_contracts_status_idx').on(table.status),
    bnpl_contracts_community_created_idx: index('bnpl_contracts_community_created_idx').on(
      table.communityId,
      table.createdAt,
    ),
  }),
);

export const bnplInstallments = pgTable(
  'bnpl_installments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => bnplContracts.id, { onDelete: 'cascade' }),
    installmentNumber: integer('installment_number').notNull(),
    dueDate: date('due_date').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    status: bnplInstallmentStatusEnum('status').notNull().default('PENDING'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paymentMethod: varchar('payment_method', { length: 50 }),
    referenceNumber: varchar('reference_number', { length: 255 }),
    verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bnpl_installments_contract_number_idx: uniqueIndex('bnpl_installments_contract_number_idx').on(
      table.contractId,
      table.installmentNumber,
    ),
    bnpl_installments_due_date_idx: index('bnpl_installments_due_date_idx').on(table.dueDate),
    bnpl_installments_status_idx: index('bnpl_installments_status_idx').on(table.status),
  }),
);
