/**
 * Seeds a Postgres database from `data/karkana.db.json`.
 *
 *   DATABASE_URL=postgres://… npx tsx scripts/seed.ts
 *
 * The JSON file is the development store itself, so this script is only needed
 * when moving to Postgres. Existing rows are left untouched.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { closeDb, getDb, runMigrations } from '../src/infra/db/pg/client';
import { customerAddresses, customers, orderItems, orders, products, sections } from '../src/infra/db/schema';
import {
  normalizeOrder,
  normalizeProduct,
  normalizeSection,
} from '../src/infra/db/normalize';
import { systemClock } from '../src/infra/system';

const DB_FILE = path.join(process.cwd(), 'data', 'karkana.db.json');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Nothing to seed — the JSON adapter needs no seeding.');
    process.exit(1);
  }

  const raw = JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as Record<string, unknown[]>;
  const db = getDb();

  console.log('Applying migrations…');
  await runMigrations();

  const items = {
    products: (raw.products ?? []).map((entry) => normalizeProduct(entry as Record<string, unknown>)),
    sections: (raw.sections ?? []).map((entry) => normalizeSection(entry as Record<string, unknown>)),
    orders: (raw.orders ?? []).map((entry) => normalizeOrder(entry as Record<string, unknown>)),
  };

  console.log(`Inserting ${items.products.length} products…`);
  for (const product of items.products) {
    await db
      .insert(products)
      .values({
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        subcategory: product.subcategory,
        description: product.description,
        shortDescription: product.shortDescription,
        price: String(product.price),
        originalPrice: product.originalPrice === null ? null : String(product.originalPrice),
        stockQuantity: product.stockQuantity,
        unit: product.unit,
        images: product.images,
        video: product.video,
        module: product.module,
        displayPosition: product.displayPosition,
        isFeatured: product.isFeatured,
        isPopular: product.isPopular,
        isVisible: product.isVisible,
        inStock: product.inStock,
        searchKeywords: product.searchKeywords,
        safetyInstructions: product.safetyInstructions,
        notes: product.notes,
        imageWidth: product.imageWidth,
        imageHeight: product.imageHeight,
        orientation: product.orientation,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
      })
      .onConflictDoNothing();
  }

  console.log(`Inserting ${items.sections.length} sections…`);
  for (const section of items.sections) {
    await db
      .insert(sections)
      .values({
        id: section.id,
        key: section.key,
        title: section.title,
        subtitle: section.subtitle,
        isVisible: section.isVisible,
        displayPosition: section.displayPosition,
      })
      .onConflictDoNothing();
  }

  console.log(`Inserting ${items.orders.length} orders…`);
  for (const order of items.orders) {
    await db
      .insert(orders)
      .values({
        id: order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        mobile: order.mobile,
        address: order.address,
        subtotalPaise: order.subtotalPaise,
        feesPaise: order.feesPaise,
        shippingPaise: order.shippingPaise,
        totalPaise: order.totalPaise,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
      })
      .onConflictDoNothing();

    if (order.items.length > 0) {
      await db
        .insert(orderItems)
        .values(
          order.items.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            module: item.module,
            unitPricePaise: item.unitPricePaise,
            quantity: item.quantity,
            lineTotalPaise: item.lineTotalPaise,
            personalizationFeePaise: item.personalizationFeePaise,
            personalizationImage: item.personalizationImage,
            customizationNotes: item.customizationNotes,
          })),
        )
        .onConflictDoNothing();
    }
  }

  const counts = {
    products: await db.select().from(products),
    customers: await db.select().from(customers),
    addresses: await db.select().from(customerAddresses),
  };

  console.log('Seed complete.', {
    products: counts.products.length,
    customers: counts.customers.length,
    addresses: counts.addresses.length,
    seededAt: systemClock.iso(),
  });

  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
