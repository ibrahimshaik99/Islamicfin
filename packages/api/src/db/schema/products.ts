import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { merchants } from './merchants';

export const categoryStatusEnum = pgEnum('category_status', ['ACTIVE', 'DISABLED']);

export const productCategories = pgTable(
  'product_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    status: categoryStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    product_categories_community_slug_idx: uniqueIndex('product_categories_community_slug_idx').on(table.communityId, table.slug),
    product_categories_community_id_idx: index('product_categories_community_id_idx').on(table.communityId),
  }),
);

export const productStatusEnum = pgEnum('product_status', [
  'ACTIVE',
  'DRAFT',
  'ARCHIVED',
  'OUT_OF_STOCK',
]);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => productCategories.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    salePrice: numeric('sale_price', { precision: 12, scale: 2 }),
    sku: varchar('sku', { length: 100 }),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    status: productStatusEnum('status').notNull().default('DRAFT'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    products_community_id_idx: index('products_community_id_idx').on(table.communityId),
    products_merchant_id_idx: index('products_merchant_id_idx').on(table.merchantId),
    products_category_id_idx: index('products_category_id_idx').on(table.categoryId),
    products_status_idx: index('products_status_idx').on(table.status),
    products_community_merchant_idx: index('products_community_merchant_idx').on(table.communityId, table.merchantId),
  }),
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    product_images_product_id_idx: index('product_images_product_id_idx').on(table.productId),
  }),
);
