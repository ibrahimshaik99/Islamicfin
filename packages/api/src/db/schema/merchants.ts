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

export const merchantVerificationStatusEnum = pgEnum('merchant_verification_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
]);

export const merchants = pgTable(
  'merchants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    businessName: varchar('business_name', { length: 255 }).notNull(),
    description: text('description'),
    phone: varchar('phone', { length: 20 }),
    whatsapp: varchar('whatsapp', { length: 20 }),
    upiId: varchar('upi_id', { length: 255 }),
    upiQrUrl: text('upi_qr_url'),
    address: text('address'),
    verificationStatus: merchantVerificationStatusEnum('verification_status')
      .notNull()
      .default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    merchants_community_id_idx: index('merchants_community_id_idx').on(table.communityId),
    merchants_user_id_idx: index('merchants_user_id_idx').on(table.userId),
    merchants_verification_status_idx: index('merchants_verification_status_idx').on(table.verificationStatus),
  }),
);
