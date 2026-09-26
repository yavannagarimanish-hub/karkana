import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/core/domain/order';
import { PRODUCT_MODULES, ORIENTATIONS } from '@/core/domain/product';
import { SECTION_KEYS } from '@/core/domain/catalogue';

export const productModuleEnum = pgEnum('product_module', PRODUCT_MODULES);
export const orientationEnum = pgEnum('orientation', ORIENTATIONS);
export const orderStatusEnum = pgEnum('order_status', ORDER_STATUSES);
export const paymentMethodEnum = pgEnum('payment_method', PAYMENT_METHODS);
export const paymentStatusEnum = pgEnum('payment_status', PAYMENT_STATUSES);
export const sectionKeyEnum = pgEnum('section_key', SECTION_KEYS);

/* ── Catalogue ──────────────────────────────────────────────────────────── */

export const products = pgTable(
  'products',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    brand: varchar('brand', { length: 100 }).notNull().default(''),
    category: varchar('category', { length: 100 }).notNull().default(''),
    subcategory: varchar('subcategory', { length: 100 }).notNull().default(''),
    description: text('description').notNull().default(''),
    shortDescription: text('short_description').notNull().default(''),
    /** Rupees. Orders store integer paise instead. */
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    originalPrice: numeric('original_price', { precision: 12, scale: 2 }),
    stockQuantity: integer('stock_quantity'),
    unit: varchar('unit', { length: 50 }).notNull().default(''),
    images: jsonb('images').$type<string[]>().notNull().default([]),
    video: varchar('video', { length: 500 }).notNull().default(''),
    module: productModuleEnum('module').notNull(),
    displayPosition: integer('display_position').notNull().default(0),
    isFeatured: boolean('is_featured').notNull().default(false),
    isPopular: boolean('is_popular').notNull().default(false),
    isVisible: boolean('is_visible').notNull().default(true),
    inStock: boolean('in_stock').notNull().default(true),
    searchKeywords: text('search_keywords').notNull().default(''),
    safetyInstructions: text('safety_instructions').notNull().default(''),
    notes: text('notes').notNull().default(''),
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    orientation: orientationEnum('orientation'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('products_module_idx').on(table.module),
    index('products_category_idx').on(table.category),
    index('products_position_idx').on(table.displayPosition),
    index('products_visible_idx').on(table.isVisible),
  ],
);

export const sections = pgTable('sections', {
  id: varchar('id', { length: 50 }).primaryKey(),
  key: sectionKeyEnum('key').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  subtitle: varchar('subtitle', { length: 400 }).notNull().default(''),
  isVisible: boolean('is_visible').notNull().default(true),
  displayPosition: integer('display_position').notNull().default(0),
});

/* ── Customers ──────────────────────────────────────────────────────────── */

export const customers = pgTable(
  'customers',
  {
    id: varchar('id', { length: 40 }).primaryKey(),
    email: varchar('email', { length: 254 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 16 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('customers_email_uidx').on(table.email)],
);

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: varchar('id', { length: 40 }).primaryKey(),
    customerId: varchar('customer_id', { length: 40 })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 40 }).notNull().default('Home'),
    houseFlat: varchar('house_flat', { length: 200 }).notNull(),
    streetLocality: varchar('street_locality', { length: 200 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    pincode: varchar('pincode', { length: 6 }).notNull(),
    instructions: text('instructions').notNull().default(''),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('customer_addresses_customer_idx').on(table.customerId)],
);

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    customerId: varchar('customer_id', { length: 40 })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 50 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.customerId, table.productId] })],
);

/* ── Orders ─────────────────────────────────────────────────────────────── */

export const orders = pgTable(
  'orders',
  {
    id: varchar('id', { length: 20 }).primaryKey(),
    customerId: varchar('customer_id', { length: 40 }).references(() => customers.id, {
      onDelete: 'set null',
    }),
    customerName: varchar('customer_name', { length: 120 }).notNull(),
    mobile: varchar('mobile', { length: 16 }).notNull(),
    address: jsonb('address')
      .$type<{
        houseFlat: string;
        streetLocality: string;
        city: string;
        state: string;
        pincode: string;
        instructions: string;
      }>()
      .notNull(),
    /** Integer paise — never floats. */
    subtotalPaise: integer('subtotal_paise').notNull(),
    feesPaise: integer('fees_paise').notNull().default(0),
    shippingPaise: integer('shipping_paise').notNull().default(0),
    totalPaise: integer('total_paise').notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull().default('COD'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('PENDING'),
    status: orderStatusEnum('status').notNull().default('NEW'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('orders_status_idx').on(table.status),
    index('orders_customer_idx').on(table.customerId),
    index('orders_created_idx').on(table.createdAt),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    orderId: varchar('order_id', { length: 20 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 50 }).notNull(),
    productName: varchar('product_name', { length: 255 }).notNull(),
    productImage: varchar('product_image', { length: 500 }),
    module: productModuleEnum('module').notNull(),
    unitPricePaise: integer('unit_price_paise').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalPaise: integer('line_total_paise').notNull(),
    personalizationFeePaise: integer('personalization_fee_paise').notNull().default(0),
    personalizationImage: varchar('personalization_image', { length: 500 }),
    customizationNotes: text('customization_notes'),
  },
  (table) => [primaryKey({ columns: [table.orderId, table.productId] })],
);

/* ── Relations (used by Drizzle's relational query builder) ─────────────── */

export const customersRelations = relations(customers, ({ many }) => ({
  addresses: many(customerAddresses),
  orders: many(orders),
  wishlist: many(wishlistItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  items: many(orderItems),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const schema = {
  products,
  sections,
  customers,
  customerAddresses,
  wishlistItems,
  orders,
  orderItems,
};

export type ProductRow = typeof products.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type CustomerRow = typeof customers.$inferSelect;
export type AddressRow = typeof customerAddresses.$inferSelect;
export type SectionRow = typeof sections.$inferSelect;
