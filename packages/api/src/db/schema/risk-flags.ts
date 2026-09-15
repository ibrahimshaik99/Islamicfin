import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const riskFlagSeverityEnum = pgEnum('risk_flag_severity', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

export const riskFlagStatusEnum = pgEnum('risk_flag_status', [
  'FLAGGED',
  'UNDER_REVIEW',
  'CONFIRMED',
  'DISMISSED',
]);

export const riskFlags = pgTable(
  'risk_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id').references(() => communities.id, {
      onDelete: 'set null',
    }),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    severity: riskFlagSeverityEnum('severity').notNull().default('LOW'),
    reason: varchar('reason', { length: 500 }).notNull(),
    status: riskFlagStatusEnum('status').notNull().default('FLAGGED'),
    reviewerId: uuid('reviewer_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    risk_flags_community_id_idx: index('risk_flags_community_id_idx').on(table.communityId),
    risk_flags_status_idx: index('risk_flags_status_idx').on(table.status),
    risk_flags_entity_idx: index('risk_flags_entity_idx').on(table.entityType, table.entityId),
  }),
);
