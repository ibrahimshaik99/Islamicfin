import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const serviceCategories = pgTable(
  'service_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    service_categories_community_id_idx: index('service_categories_community_id_idx').on(table.communityId),
  }),
);

export const serviceListingStatusEnum = pgEnum('service_listing_status', [
  'ACTIVE',
  'PAUSED',
  'ARCHIVED',
]);

export const serviceListings = pgTable(
  'service_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => serviceCategories.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    price: numeric('price', { precision: 12, scale: 2 }),
    contactName: varchar('contact_name', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 20 }),
    location: varchar('location', { length: 255 }),
    availability: text('availability'),
    status: serviceListingStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    service_listings_community_id_idx: index('service_listings_community_id_idx').on(table.communityId),
    service_listings_provider_id_idx: index('service_listings_provider_id_idx').on(table.providerId),
    service_listings_category_id_idx: index('service_listings_category_id_idx').on(table.categoryId),
    service_listings_status_idx: index('service_listings_status_idx').on(table.status),
  }),
);

export const serviceRequestStatusEnum = pgEnum('service_request_status', [
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
]);

export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => serviceListings.id, { onDelete: 'cascade' }),
    description: text('description'),
    status: serviceRequestStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    service_requests_community_id_idx: index('service_requests_community_id_idx').on(table.communityId),
    service_requests_requester_id_idx: index('service_requests_requester_id_idx').on(table.requesterId),
    service_requests_service_id_idx: index('service_requests_service_id_idx').on(table.serviceId),
    service_requests_status_idx: index('service_requests_status_idx').on(table.status),
  }),
);
