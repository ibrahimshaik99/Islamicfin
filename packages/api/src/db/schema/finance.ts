import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  date,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const contractTypeEnum = pgEnum('contract_type', [
  'MUDARABAH',
  'MUSHARAKAH',
  'MURABAHAH',
  'IJARAH',
  'QARD_HASAN',
  'SADAQAH',
]);

export const financeContractStatusEnum = pgEnum('finance_contract_status', [
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'TERMINATED',
]);

export const shariahReviewStatusEnum = pgEnum('shariah_review_status', [
  'PENDING_REVIEW',
  'REVIEWED',
  'NEEDS_REVISION',
  'ARCHIVED',
]);

export const legalStatusEnum = pgEnum('legal_status', [
  'DRAFT',
  'UNDER_REVIEW',
  'APPROVED_FOR_DISPLAY',
  'APPROVED_FOR_EXECUTION',
  'BLOCKED',
  'ARCHIVED',
]);

export const financeContracts = pgTable(
  'finance_contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    contractType: contractTypeEnum('contract_type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    initiatorId: uuid('initiator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: financeContractStatusEnum('status').notNull().default('DRAFT'),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    principalAmount: numeric('principal_amount', { precision: 14, scale: 2 }).notNull(),
    startDate: date('start_date'),
    endDate: date('end_date'),
    termsVersion: integer('terms_version').notNull().default(1),
    shariahReviewStatus: shariahReviewStatusEnum('shariah_review_status')
      .notNull()
      .default('PENDING_REVIEW'),
    legalStatus: legalStatusEnum('legal_status').notNull().default('DRAFT'),
    executionApproved: varchar('execution_approved', { length: 20 }).notNull().default('NO'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    finance_contracts_community_id_idx: index('finance_contracts_community_id_idx').on(table.communityId),
    finance_contracts_initiator_id_idx: index('finance_contracts_initiator_id_idx').on(table.initiatorId),
    finance_contracts_status_idx: index('finance_contracts_status_idx').on(table.status),
    finance_contracts_contract_type_idx: index('finance_contracts_contract_type_idx').on(table.contractType),
  }),
);

export const financeParticipants = pgTable(
  'finance_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => financeContracts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    participantRole: varchar('participant_role', { length: 100 }).notNull(),
    contributionAmount: numeric('contribution_amount', { precision: 14, scale: 2 }),
    profitShare: numeric('profit_share', { precision: 5, scale: 2 }),
    ownershipShare: numeric('ownership_share', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    finance_participants_contract_id_idx: index('finance_participants_contract_id_idx').on(table.contractId),
    finance_participants_user_id_idx: index('finance_participants_user_id_idx').on(table.userId),
  }),
);

export const financeTerms = pgTable(
  'finance_terms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => financeContracts.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    termsJson: jsonb('terms_json').notNull(),
    effectiveAt: timestamp('effective_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    finance_terms_contract_id_idx: index('finance_terms_contract_id_idx').on(table.contractId),
  }),
);

export const financeAssets = pgTable(
  'finance_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => financeContracts.id, { onDelete: 'cascade' }),
    description: text('description'),
    seller: varchar('seller', { length: 255 }),
    purchasePrice: numeric('purchase_price', { precision: 14, scale: 2 }),
    purchaseDate: date('purchase_date'),
    ownershipStatus: varchar('ownership_status', { length: 100 }),
    possessionStatus: varchar('possession_status', { length: 100 }),
    salePrice: numeric('sale_price', { precision: 14, scale: 2 }),
    saleDate: date('sale_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    finance_assets_contract_id_idx: index('finance_assets_contract_id_idx').on(table.contractId),
  }),
);

export const financeTransactionStatusEnum = pgEnum('finance_transaction_status', [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const financeTransactions = pgTable(
  'finance_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => financeContracts.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 100 }).notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    reference: varchar('reference', { length: 255 }),
    paymentMethod: varchar('payment_method', { length: 50 }),
    status: financeTransactionStatusEnum('status').notNull().default('PENDING'),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    finance_transactions_contract_id_idx: index('finance_transactions_contract_id_idx').on(table.contractId),
    finance_transactions_status_idx: index('finance_transactions_status_idx').on(table.status),
  }),
);

export const financeDocuments = pgTable(
  'finance_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => financeContracts.id, { onDelete: 'cascade' }),
    documentType: varchar('document_type', { length: 100 }).notNull(),
    fileUrl: text('file_url').notNull(),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    finance_documents_contract_id_idx: index('finance_documents_contract_id_idx').on(table.contractId),
  }),
);

export const financeReviewStatusEnum = pgEnum('finance_review_status', [
  'PENDING_REVIEW',
  'REVIEWED',
  'NEEDS_REVISION',
  'ARCHIVED',
]);

export const financeReviews = pgTable(
  'finance_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => financeContracts.id, { onDelete: 'cascade' }),
    reviewer: varchar('reviewer', { length: 255 }).notNull(),
    status: financeReviewStatusEnum('status').notNull().default('PENDING_REVIEW'),
    comments: text('comments'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    finance_reviews_contract_id_idx: index('finance_reviews_contract_id_idx').on(table.contractId),
    finance_reviews_status_idx: index('finance_reviews_status_idx').on(table.status),
  }),
);
