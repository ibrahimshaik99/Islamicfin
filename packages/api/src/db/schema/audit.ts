import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id').references(() => communities.id, {
      onDelete: 'set null',
    }),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 255 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id'),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    ipHash: varchar('ip_hash', { length: 255 }),
    userAgent: varchar('user_agent', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    audit_logs_community_id_idx: index('audit_logs_community_id_idx').on(table.communityId),
    audit_logs_actor_id_idx: index('audit_logs_actor_id_idx').on(table.actorId),
    audit_logs_action_idx: index('audit_logs_action_idx').on(table.action),
    audit_logs_entity_type_entity_id_idx: index('audit_logs_entity_type_entity_id_idx').on(table.entityType, table.entityId),
    audit_logs_created_at_idx: index('audit_logs_created_at_idx').on(table.createdAt),
  }),
);
