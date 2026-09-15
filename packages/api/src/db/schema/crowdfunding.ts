import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const projectTypeEnum = pgEnum('project_type', ['DONATION', 'INVESTMENT']);

export const crowdfundingProjectStatusEnum = pgEnum('crowdfunding_project_status', [
  'DRAFT',
  'PENDING_APPROVAL',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
]);

export const crowdfundingProjects = pgTable(
  'crowdfunding_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    goalAmount: numeric('goal_amount', { precision: 12, scale: 2 }).notNull(),
    raisedAmount: numeric('raised_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    projectType: projectTypeEnum('project_type').notNull(),
    status: crowdfundingProjectStatusEnum('status').notNull().default('DRAFT'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    // Investment-specific fields
    contractType: varchar('contract_type', { length: 50 }),
    riskDisclosure: text('risk_disclosure'),
    expectedReturns: text('expected_returns'),
    investmentThesis: text('investment_thesis'),
    shariahReviewStatus: varchar('shariah_review_status', { length: 50 }).default('PENDING_REVIEW'),
    legalStatus: varchar('legal_status', { length: 100 }),
    legalGatePassed: varchar('legal_gate_passed', { length: 20 }).default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    crowdfunding_projects_community_id_idx: index('crowdfunding_projects_community_id_idx').on(table.communityId),
    crowdfunding_projects_creator_id_idx: index('crowdfunding_projects_creator_id_idx').on(table.creatorId),
    crowdfunding_projects_status_idx: index('crowdfunding_projects_status_idx').on(table.status),
    crowdfunding_projects_project_type_idx: index('crowdfunding_projects_project_type_idx').on(table.projectType),
  }),
);

export const contributionTypeEnum = pgEnum('contribution_type', ['DONATION', 'INVESTMENT']);

export const crowdfundingContributionStatusEnum = pgEnum('crowdfunding_contribution_status', [
  'PENDING',
  'REPORTED',
  'VERIFIED',
  'REJECTED',
]);

export const crowdfundingContributions = pgTable(
  'crowdfunding_contributions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => crowdfundingProjects.id, { onDelete: 'cascade' }),
    contributorId: uuid('contributor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    contributionType: contributionTypeEnum('contribution_type').notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }),
    referenceNumber: varchar('reference_number', { length: 255 }),
    proofUrl: text('proof_url'),
    status: crowdfundingContributionStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    crowdfunding_contributions_project_id_idx: index('crowdfunding_contributions_project_id_idx').on(table.projectId),
    crowdfunding_contributions_contributor_id_idx: index('crowdfunding_contributions_contributor_id_idx').on(table.contributorId),
    crowdfunding_contributions_status_idx: index('crowdfunding_contributions_status_idx').on(table.status),
  }),
);

// Investment interest status enum
export const investmentInterestStatusEnum = pgEnum('investment_interest_status', [
  'INTERESTED',
  'CONTACTED',
  'FOLLOWED_UP',
  'WITHDRAWN',
  'NOT_INTERESTED',
]);

// Investment interest table - for "Express Interest" flow
export const investmentInterests = pgTable(
  'investment_interests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => crowdfundingProjects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }),
    status: investmentInterestStatusEnum('status').notNull().default('INTERESTED'),
    notes: text('notes'),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    investment_interests_project_id_idx: index('investment_interests_project_id_idx').on(table.projectId),
    investment_interests_user_id_idx: index('investment_interests_user_id_idx').on(table.userId),
    investment_interests_status_idx: index('investment_interests_status_idx').on(table.status),
  }),
);
