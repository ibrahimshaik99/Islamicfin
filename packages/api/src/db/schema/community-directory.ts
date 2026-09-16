import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const directoryRoleEnum = pgEnum('directory_role', ['CUSTOMER', 'MERCHANT', 'COMMUNITY_ADMIN', 'COMMUNITY_MODERATOR']);
export const kametiPreferenceEnum = pgEnum('kameti_preference', ['YES', 'NO', 'MAYBE']);
export const financeTypeEnum = pgEnum('finance_type', ['QARD_HASAN', 'MUDARABAH', 'MUSHARAKAH', 'MURABAHAH', 'IJARAH', 'NONE']);

export const communityDirectory = pgTable('community_directory', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id').notNull().references(() => communities.id),
  addedByUserId: uuid('added_by_user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  email: varchar('email', { length: 255 }),
  documentUrl: varchar('document_url', { length: 500 }),
  documentType: varchar('document_type', { length: 100 }),
  financeType: financeTypeEnum('finance_type').default('NONE'),
  kametiPreference: kametiPreferenceEnum('kameti_preference').default('NO'),
  role: directoryRoleEnum('role').default('CUSTOMER'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contractTemplates = pgTable('contract_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id').notNull().references(() => communities.id),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  contractType: varchar('contract_type', { length: 50 }).notNull(),
  content: text('content').notNull(),
  principalAmount: varchar('principal_amount', { length: 50 }),
  partnerName: varchar('partner_name', { length: 255 }),
  durationMonths: varchar('duration_months', { length: 20 }),
  profitSharePercent: varchar('profit_share_percent', { length: 10 }),
  assetDescription: text('asset_description'),
  additionalTerms: text('additional_terms'),
  status: varchar('status', { length: 20 }).default('DRAFT'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
