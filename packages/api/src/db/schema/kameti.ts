import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  date,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const kametiGroupStatusEnum = pgEnum('kameti_group_status', [
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'PAUSED',
]);

export const kametiFrequencyEnum = pgEnum('kameti_frequency', [
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
]);

export const kametiGroups = pgTable(
  'kameti_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    contributionAmount: numeric('contribution_amount', { precision: 12, scale: 2 }).notNull(),
    frequency: kametiFrequencyEnum('frequency').notNull(),
    totalMembers: integer('total_members').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    status: kametiGroupStatusEnum('status').notNull().default('ACTIVE'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    kameti_groups_community_id_idx: index('kameti_groups_community_id_idx').on(table.communityId),
    kameti_groups_status_idx: index('kameti_groups_status_idx').on(table.status),
    kameti_groups_created_by_idx: index('kameti_groups_created_by_idx').on(table.createdBy),
  }),
);

export const kametiMemberStatusEnum = pgEnum('kameti_member_status', [
  'ACTIVE',
  'LEFT',
  'REMOVED',
  'COMPLETED',
]);

export const kametiMembers = pgTable(
  'kameti_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kametiGroupId: uuid('kameti_group_id')
      .notNull()
      .references(() => kametiGroups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    status: kametiMemberStatusEnum('status').notNull().default('ACTIVE'),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    kameti_members_group_id_idx: index('kameti_members_group_id_idx').on(table.kametiGroupId),
    kameti_members_user_id_idx: index('kameti_members_user_id_idx').on(table.userId),
  }),
);

export const kametiPeriodStatusEnum = pgEnum('kameti_period_status', [
  'PENDING',
  'ACTIVE',
  'COMPLETED',
  'DEFAULTED',
]);

export const kametiPeriods = pgTable(
  'kameti_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kametiGroupId: uuid('kameti_group_id')
      .notNull()
      .references(() => kametiGroups.id, { onDelete: 'cascade' }),
    periodNumber: integer('period_number').notNull(),
    dueDate: date('due_date').notNull(),
    status: kametiPeriodStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    kameti_periods_group_id_idx: index('kameti_periods_group_id_idx').on(table.kametiGroupId),
    kameti_periods_status_idx: index('kameti_periods_status_idx').on(table.status),
  }),
);

export const kametiContributionStatusEnum = pgEnum('kameti_contribution_status', [
  'PENDING',
  'PAID',
  'VERIFIED',
  'REJECTED',
  'LATE',
]);

export const kametiContributions = pgTable(
  'kameti_contributions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kametiGroupId: uuid('kameti_group_id')
      .notNull()
      .references(() => kametiGroups.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => kametiMembers.id, { onDelete: 'cascade' }),
    periodId: uuid('period_id')
      .notNull()
      .references(() => kametiPeriods.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }),
    referenceNumber: varchar('reference_number', { length: 255 }),
    proofUrl: text('proof_url'),
    status: kametiContributionStatusEnum('status').notNull().default('PENDING'),
    verifiedBy: uuid('verified_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    kameti_contributions_group_id_idx: index('kameti_contributions_group_id_idx').on(table.kametiGroupId),
    kameti_contributions_member_id_idx: index('kameti_contributions_member_id_idx').on(table.memberId),
    kameti_contributions_period_id_idx: index('kameti_contributions_period_id_idx').on(table.periodId),
    kameti_contributions_status_idx: index('kameti_contributions_status_idx').on(table.status),
  }),
);

export const kametiPayoutStatusEnum = pgEnum('kameti_payout_status', [
  'PENDING',
  'PAID',
  'COMPLETED',
  'CANCELLED',
]);

export const kametiPayouts = pgTable(
  'kameti_payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kametiGroupId: uuid('kameti_group_id')
      .notNull()
      .references(() => kametiGroups.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => kametiMembers.id, { onDelete: 'cascade' }),
    periodId: uuid('period_id')
      .notNull()
      .references(() => kametiPeriods.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    status: kametiPayoutStatusEnum('status').notNull().default('PENDING'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    referenceNumber: varchar('reference_number', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    kameti_payouts_group_id_idx: index('kameti_payouts_group_id_idx').on(table.kametiGroupId),
    kameti_payouts_member_id_idx: index('kameti_payouts_member_id_idx').on(table.memberId),
    kameti_payouts_period_id_idx: index('kameti_payouts_period_id_idx').on(table.periodId),
    kameti_payouts_status_idx: index('kameti_payouts_status_idx').on(table.status),
  }),
);
