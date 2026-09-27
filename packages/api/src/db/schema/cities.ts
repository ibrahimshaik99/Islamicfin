import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const cityStatusEnum = pgEnum('city_status', ['ACTIVE', 'DISABLED']);

/**
 * Normalized list of cities. Communities reference a city via `communities.city_id`.
 * City + community slug uniquely identify a tenant.
 */
export const cities = pgTable(
  'cities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    state: varchar('state', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 140 }).notNull().unique(),
    status: cityStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cities_name_state_idx: uniqueIndex('cities_name_state_idx').on(
      table.name,
      table.state,
    ),
    cities_status_idx: index('cities_status_idx').on(table.status),
    cities_name_idx: index('cities_name_idx').on(table.name),
  }),
);
