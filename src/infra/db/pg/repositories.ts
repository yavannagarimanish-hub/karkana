import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type {
  CustomerRepository,
  NewAddress,
  NewCustomer,
  OrderListFilter,
  OrderMetrics,
  OrderRepository,
  ProductListFilter,
  ProductRepository,
  SectionPatch,
  SectionRepository,
} from '@/core/ports';
import type { Customer, CustomerAddress } from '@/core/domain/account';
import type { CatalogueSection } from '@/core/domain/catalogue';
import {
  ORDER_STATUSES,
  paymentStatusFor,
  type Order,
  type OrderItem,
  type OrderStatus,
} from '@/core/domain/order';
import type { Orientation, Product, ProductInput, ProductModule } from '@/core/domain/product';
import type { Db } from './client';
import {
  customerAddresses,
  customers,
  orderItems,
  orders,
  products,
  sections,
  wishlistItems,
  type AddressRow,
  type CustomerRow,
  type OrderItemRow,
  type OrderRow,
  type ProductRow,
  type SectionRow,
} from '../schema';

/* ── Row → domain mappers ───────────────────────────────────────────────── */

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    subcategory: row.subcategory,
    description: row.description,
    shortDescription: row.shortDescription,
    price: Number(row.price),
    originalPrice: row.originalPrice === null ? null : Number(row.originalPrice),
    stockQuantity: row.stockQuantity,
    unit: row.unit,
    images: row.images ?? [],
    video: row.video,
    module: row.module as ProductModule,
    displayPosition: row.displayPosition,
    isFeatured: row.isFeatured,
    isPopular: row.isPopular,
    isVisible: row.isVisible,
    inStock: row.inStock,
    searchKeywords: row.searchKeywords,
    safetyInstructions: row.safetyInstructions,
    notes: row.notes,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    orientation: row.orientation as Orientation | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSection(row: SectionRow): CatalogueSection {
  return {
    id: row.id,
    key: row.key as CatalogueSection['key'],
    title: row.title,
    subtitle: row.subtitle,
    isVisible: row.isVisible,
    displayPosition: row.displayPosition,
  };
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  };
}

function toAddress(row: AddressRow): CustomerAddress {
  return {
    id: row.id,
    customerId: row.customerId,
    label: row.label,
    houseFlat: row.houseFlat,
    streetLocality: row.streetLocality,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    instructions: row.instructions,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
  };
}

function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    productId: row.productId,
    productName: row.productName,
    productImage: row.productImage,
    module: row.module as ProductModule,
    unitPricePaise: row.unitPricePaise,
    quantity: row.quantity,
    lineTotalPaise: row.lineTotalPaise,
    personalizationFeePaise: row.personalizationFeePaise,
    personalizationImage: row.personalizationImage,
    customizationNotes: row.customizationNotes,
  };
}

function toOrder(row: OrderRow, items: OrderItem[] = []): Order {
  return {
    id: row.id,
    customerId: row.customerId,
    customerName: row.customerName,
    mobile: row.mobile,
    address: row.address,
    items,
    subtotalPaise: row.subtotalPaise,
    feesPaise: row.feesPaise,
    shippingPaise: row.shippingPaise,
    totalPaise: row.totalPaise,
    paymentMethod: row.paymentMethod as Order['paymentMethod'],
    paymentStatus: row.paymentStatus as Order['paymentStatus'],
    status: row.status as OrderStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function productValues(input: ProductInput) {
  return {
    name: input.name,
    brand: input.brand ?? '',
    category: input.category ?? '',
    subcategory: input.subcategory ?? '',
    description: input.description ?? '',
    shortDescription: input.shortDescription ?? '',
    price: String(input.price),
    originalPrice: input.originalPrice === null || input.originalPrice === undefined ? null : String(input.originalPrice),
    stockQuantity: input.stockQuantity ?? null,
    unit: input.unit ?? '',
    images: input.images ?? [],
    video: input.video ?? '',
    module: input.module,
    displayPosition: input.displayPosition ?? 0,
    isFeatured: input.isFeatured ?? false,
    isPopular: input.isPopular ?? false,
    isVisible: input.isVisible ?? true,
    inStock: input.inStock ?? true,
    searchKeywords: input.searchKeywords ?? '',
    safetyInstructions: input.safetyInstructions ?? '',
    notes: input.notes ?? '',
    imageWidth: input.imageWidth ?? null,
    imageHeight: input.imageHeight ?? null,
    orientation: input.orientation ?? null,
  };
}

/* ── Products ───────────────────────────────────────────────────────────── */

export function createPgProductRepository(db: Db): ProductRepository {
  async function nextId(): Promise<string> {
    const [row] = await db
      .select({ highest: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${products.id} FROM 4) AS INTEGER)), 0)` })
      .from(products)
      .where(sql`${products.id} ~ '^KRK[0-9]+$'`);

    return `KRK${String(Number(row?.highest ?? 0) + 1).padStart(3, '0')}`;
  }

  /** Partial update: only the keys present in the patch are written. */
  function patchValues(patch: Partial<ProductInput>) {
    const full = productValues(patch as ProductInput);
    const values: Record<string, unknown> = {};
    for (const key of Object.keys(patch) as (keyof ProductInput)[]) {
      if (key === 'id') continue;
      if (key in full) values[key] = full[key as keyof typeof full];
    }
    return values;
  }

  return {
    async list(filter: ProductListFilter = {}) {
      const conditions = [];
      if (!filter.includeHidden) conditions.push(eq(products.isVisible, true));
      if (filter.module) conditions.push(eq(products.module, filter.module));
      if (filter.category) conditions.push(eq(products.category, filter.category));
      if (filter.featured) conditions.push(eq(products.isFeatured, true));
      if (filter.popular) conditions.push(eq(products.isPopular, true));

      const rows = await db
        .select()
        .from(products)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(products.displayPosition), asc(products.id));

      return rows.map(toProduct);
    },

    async findById(id) {
      const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
      return rows[0] ? toProduct(rows[0]) : null;
    },

    async findByIds(ids) {
      if (ids.length === 0) return [];
      const rows = await db.select().from(products).where(inArray(products.id, [...ids]));
      return rows.map(toProduct);
    },

    async create(input) {
      const id = input.id ?? (await nextId());
      const [row] = await db
        .insert(products)
        .values({ id, ...productValues(input) })
        .returning();
      return toProduct(row!);
    },

    async update(id, patch) {
      const [row] = await db
        .update(products)
        .set({ ...patchValues(patch), updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      return row ? toProduct(row) : null;
    },

    async remove(id) {
      const deleted = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
      return deleted.length > 0;
    },

    async reorder(ids) {
      if (ids.length === 0) return;
      const cases = ids.map((id, index) => sql`WHEN ${id} THEN ${index + 1}`);
      await db
        .update(products)
        .set({
          displayPosition: sql`CASE ${products.id} ${sql.join(cases, sql` `)} ELSE ${products.displayPosition} END`,
          updatedAt: new Date(),
        })
        .where(inArray(products.id, [...ids]));
    },

    async nextId() {
      return nextId();
    },
  };
}

/* ── Sections ───────────────────────────────────────────────────────────── */

export function createPgSectionRepository(db: Db): SectionRepository {
  return {
    async list() {
      const rows = await db.select().from(sections).orderBy(asc(sections.displayPosition));
      return rows.map(toSection);
    },

    async update(id, patch: SectionPatch) {
      const [row] = await db
        .update(sections)
        .set({
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle } : {}),
          ...(patch.isVisible !== undefined ? { isVisible: patch.isVisible } : {}),
          ...(patch.displayPosition !== undefined ? { displayPosition: patch.displayPosition } : {}),
        })
        .where(eq(sections.id, id))
        .returning();
      return row ? toSection(row) : null;
    },
  };
}

/* ── Orders ─────────────────────────────────────────────────────────────── */

export function createPgOrderRepository(db: Db): OrderRepository {
  async function loadItems(orderIds: string[]): Promise<Map<string, OrderItem[]>> {
    const grouped = new Map<string, OrderItem[]>();
    if (orderIds.length === 0) return grouped;

    const rows = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
    for (const row of rows) {
      const list = grouped.get(row.orderId) ?? [];
      list.push(toOrderItem(row));
      grouped.set(row.orderId, list);
    }
    return grouped;
  }

  return {
    async create(order) {
      await db.transaction(async (tx) => {
        await tx.insert(orders).values({
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
        });

        if (order.items.length > 0) {
          await tx.insert(orderItems).values(
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
          );
        }
      });

      return order;
    },

    async findById(id) {
      const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (rows.length === 0) return null;

      const items = await loadItems([id]);
      return toOrder(rows[0]!, items.get(id) ?? []);
    },

    async list(filter: OrderListFilter = {}) {
      const conditions = [];
      if (filter.status) conditions.push(eq(orders.status, filter.status));
      if (filter.customerId) conditions.push(eq(orders.customerId, filter.customerId));

      const rows = await db
        .select()
        .from(orders)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(orders.createdAt))
        .limit(filter.limit ?? 500);

      const items = await loadItems(rows.map((row) => row.id));
      return rows.map((row) => toOrder(row, items.get(row.id) ?? []));
    },

    async updateStatus(id, status: OrderStatus, at: Date) {
      const [row] = await db
        .update(orders)
        .set({ status, paymentStatus: paymentStatusFor('COD', status), updatedAt: at })
        .where(eq(orders.id, id))
        .returning();

      if (!row) return null;
      const items = await loadItems([id]);
      return toOrder(row, items.get(id) ?? []);
    },

    async metrics() {
      let rows: { status: string; count: number; total: number }[] = [];
      try {
        rows = await db
          .select({ status: orders.status, count: sql<number>`COUNT(*)::int`, total: sql<number>`COALESCE(SUM(${orders.totalPaise}), 0)::int` })
          .from(orders)
          .groupBy(orders.status);
      } catch {
        try {
          const res = await db.execute(
            sql`SELECT status, COUNT(*)::int as count, COALESCE(SUM((total_amount * 100)::int), 0)::int as total FROM orders GROUP BY status`,
          );
          rows = (res.rows ?? []) as { status: string; count: number; total: number }[];
        } catch {
          rows = [];
        }
      }

      const byStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<
        OrderStatus,
        number
      >;

      let revenuePaise = 0;
      let total = 0;

      for (const row of rows) {
        const status = row.status as OrderStatus;
        byStatus[status] = Number(row.count);
        total += Number(row.count);
        if (status !== 'CANCELLED') revenuePaise += Number(row.total);
      }

      const metrics: OrderMetrics = {
        total,
        byStatus,
        revenuePaise,
        awaitingAction: byStatus.NEW + byStatus.CONFIRMED + byStatus.PREPARING,
      };
      return metrics;
    },
  };
}

/* ── Customers ──────────────────────────────────────────────────────────── */

export function createPgCustomerRepository(db: Db): CustomerRepository {
  return {
    async findByEmail(email) {
      const rows = await db
        .select()
        .from(customers)
        .where(eq(customers.email, email.trim().toLowerCase()))
        .limit(1);
      return rows[0] ? toCustomer(rows[0]) : null;
    },

    async findById(id) {
      const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
      return rows[0] ? toCustomer(rows[0]) : null;
    },

    async create(input: NewCustomer) {
      const [row] = await db
        .insert(customers)
        .values({
          id: input.id,
          email: input.email,
          name: input.name,
          phone: input.phone,
          passwordHash: input.passwordHash,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning();
      return toCustomer(row!);
    },

    async recordLogin(id, at) {
      await db.update(customers).set({ lastLoginAt: at }).where(eq(customers.id, id));
    },

    async updatePassword(id, passwordHash, at) {
      await db.update(customers).set({ passwordHash, updatedAt: at }).where(eq(customers.id, id));
    },

    async listAddresses(customerId) {
      const rows = await db
        .select()
        .from(customerAddresses)
        .where(eq(customerAddresses.customerId, customerId))
        .orderBy(desc(customerAddresses.isDefault), asc(customerAddresses.createdAt));
      return rows.map(toAddress);
    },

    async createAddress(input: NewAddress) {
      return db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: customerAddresses.id })
          .from(customerAddresses)
          .where(eq(customerAddresses.customerId, input.customerId));
        const isFirst = existing.length === 0;

        if (input.isDefault || isFirst) {
          await tx
            .update(customerAddresses)
            .set({ isDefault: false })
            .where(eq(customerAddresses.customerId, input.customerId));
        }

        const [row] = await tx
          .insert(customerAddresses)
          .values({
            id: input.id,
            customerId: input.customerId,
            label: input.label,
            houseFlat: input.houseFlat,
            streetLocality: input.streetLocality,
            city: input.city,
            state: input.state,
            pincode: input.pincode,
            instructions: input.instructions,
            isDefault: input.isDefault || isFirst,
            createdAt: input.now,
          })
          .returning();

        return toAddress(row!);
      });
    },

    async updateAddress(customerId, addressId, patch) {
      return db.transaction(async (tx) => {
        if (patch.isDefault) {
          await tx
            .update(customerAddresses)
            .set({ isDefault: false })
            .where(eq(customerAddresses.customerId, customerId));
        }

        const [row] = await tx
          .update(customerAddresses)
          .set({
            ...(patch.label !== undefined ? { label: patch.label } : {}),
            ...(patch.houseFlat !== undefined ? { houseFlat: patch.houseFlat } : {}),
            ...(patch.streetLocality !== undefined ? { streetLocality: patch.streetLocality } : {}),
            ...(patch.city !== undefined ? { city: patch.city } : {}),
            ...(patch.state !== undefined ? { state: patch.state } : {}),
            ...(patch.pincode !== undefined ? { pincode: patch.pincode } : {}),
            ...(patch.instructions !== undefined ? { instructions: patch.instructions } : {}),
            ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
          })
          .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.customerId, customerId)))
          .returning();

        return row ? toAddress(row) : null;
      });
    },

    async removeAddress(customerId, addressId) {
      const deleted = await db
        .delete(customerAddresses)
        .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.customerId, customerId)))
        .returning({ id: customerAddresses.id });
      return deleted.length > 0;
    },

    async wishlist(customerId) {
      const rows = await db
        .select({ product: products })
        .from(wishlistItems)
        .innerJoin(products, eq(products.id, wishlistItems.productId))
        .where(eq(wishlistItems.customerId, customerId))
        .orderBy(desc(wishlistItems.createdAt));

      return rows.map((row) => toProduct(row.product));
    },

    async isWishlisted(customerId, productId) {
      const rows = await db
        .select({ productId: wishlistItems.productId })
        .from(wishlistItems)
        .where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId)))
        .limit(1);
      return rows.length > 0;
    },

    async toggleWishlist(customerId, productId) {
      const existing = await db
        .select({ productId: wishlistItems.productId })
        .from(wishlistItems)
        .where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(wishlistItems)
          .where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId)));
        return false;
      }

      await db.insert(wishlistItems).values({ customerId, productId });
      return true;
    },
  };
}
