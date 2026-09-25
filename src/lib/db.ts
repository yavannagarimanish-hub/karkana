import fs from 'fs';
import path from 'path';
import { Product, StorefrontSection, Order, OrderStatus, AdminMetrics, ProductModule } from '@/types';
import {
  isPostgresConfigured,
  pgGetProducts,
  pgGetProductById,
  pgCreateProduct,
  pgUpdateProduct,
  pgDeleteProduct,
  pgReorderProducts,
  pgGetSections,
  pgUpdateSection,
  pgGetOrders,
  pgGetOrderById,
  pgCreateOrder,
  pgUpdateOrderStatus,
  pgGetMetrics,
} from './postgres';

interface DatabaseSchema {
  products: Product[];
  sections: StorefrontSection[];
  orders: Order[];
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'karkana.db.json');

const DEFAULT_SECTIONS: StorefrontSection[] = [
  {
    id: 'sec-popular',
    key: 'popular',
    title: 'POPULAR CRACKERS',
    subtitle: 'MOST DEMANDED FORMULATIONS OF THE SEASON',
    is_visible: true,
    display_position: 1,
  },
  {
    id: 'sec-featured',
    key: 'featured',
    title: 'FEATURED PRODUCTS',
    subtitle: 'CURATED EDITIONS OF PYROTECHNIC ARTISTRY',
    is_visible: true,
    display_position: 2,
  },
  {
    id: 'sec-basic',
    key: 'basic',
    title: 'BASIC CATALOGUE',
    subtitle: 'ESSENTIAL CELEBRATION CLASSICS',
    is_visible: true,
    display_position: 3,
  },
  {
    id: 'sec-customized',
    key: 'customized',
    title: 'CUSTOMIZED CATALOGUE',
    subtitle: 'ICONIC THEMATIC PACKAGING EDITIONS',
    is_visible: true,
    display_position: 4,
  },
  {
    id: 'sec-personalized',
    key: 'personalized',
    title: 'PERSONALIZED CATALOGUE',
    subtitle: 'BESPOKE BOXES FEATURING YOUR PHOTOGRAPHY',
    is_visible: true,
    display_position: 5,
  },
];

function ensureDevDbFile(): void {
  if (process.env.NODE_ENV === 'production' && !isPostgresConfigured()) {
    throw new Error(
      '[Karkana Production] Fatal Error: DATABASE_URL is not configured. Silently falling back to local JSON persistence is strictly prohibited in production.'
    );
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      products: [],
      sections: DEFAULT_SECTIONS,
      orders: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDevDb(): DatabaseSchema {
  ensureDevDbFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    if (!raw || !raw.trim()) {
      const initialData: DatabaseSchema = {
        products: [],
        sections: DEFAULT_SECTIONS,
        orders: [],
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed reading dev database file:', error);
    return {
      products: [],
      sections: DEFAULT_SECTIONS,
      orders: [],
    };
  }
}

function writeDevDb(data: DatabaseSchema): void {
  ensureDevDbFile();
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

function assertNoProductionJsonFallback(): void {
  if (process.env.NODE_ENV === 'production' && !isPostgresConfigured()) {
    throw new Error(
      '[Karkana Production] Fatal Error: DATABASE_URL is not configured. Silently falling back to local JSON persistence is strictly prohibited in production.'
    );
  }
}

// ======================== PRODUCT OPERATIONS ========================

export async function getProducts(filters?: {
  module?: ProductModule;
  is_featured?: boolean;
  is_popular?: boolean;
  is_visible?: boolean;
  search?: string;
  category?: string;
}): Promise<Product[]> {
  if (isPostgresConfigured()) {
    return await pgGetProducts(filters);
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  let list = [...db.products];

  if (filters) {
    if (filters.module) {
      list = list.filter((p) => p.module === filters.module);
    }
    if (filters.is_featured !== undefined) {
      list = list.filter((p) => p.is_featured === filters.is_featured);
    }
    if (filters.is_popular !== undefined) {
      list = list.filter((p) => p.is_popular === filters.is_popular);
    }
    if (filters.is_visible !== undefined) {
      list = list.filter((p) => p.is_visible === filters.is_visible);
    }
    if (filters.category) {
      list = list.filter((p) => p.category.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
  }

  // Sort by display_position ASC, then created_at DESC
  return list.sort((a, b) => {
    if (a.display_position !== b.display_position) {
      return a.display_position - b.display_position;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function getProductById(id: string): Promise<Product | null> {
  if (isPostgresConfigured()) {
    return await pgGetProductById(id);
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  return db.products.find((p) => p.id === id) || null;
}

export async function createProduct(
  data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'display_position'> & {
    display_position?: number;
  }
): Promise<Product> {
  if (isPostgresConfigured()) {
    return await pgCreateProduct(data);
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  const now = new Date().toISOString();
  
  const maxPos = db.products.reduce((max, p) => Math.max(max, p.display_position || 0), 0);
  const position = data.display_position ?? (maxPos + 1);

  const newProduct: Product = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...data,
    display_position: position,
    created_at: now,
    updated_at: now,
  };

  db.products.push(newProduct);
  writeDevDb(db);
  return newProduct;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  if (isPostgresConfigured()) {
    return await pgUpdateProduct(id, updates);
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const existing = db.products[index];
  const updated: Product = {
    ...existing,
    ...updates,
    id: existing.id,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };

  db.products[index] = updated;
  writeDevDb(db);
  return updated;
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (isPostgresConfigured()) {
    return await pgDeleteProduct(id);
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  const initialLength = db.products.length;
  db.products = db.products.filter((p) => p.id !== id);
  if (db.products.length !== initialLength) {
    writeDevDb(db);
    return true;
  }
  return false;
}

export async function reorderProducts(orderedIds: string[]): Promise<Product[]> {
  if (isPostgresConfigured()) {
    return await pgReorderProducts(orderedIds);
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  const productMap = new Map(db.products.map((p) => [p.id, p]));

  orderedIds.forEach((id, idx) => {
    const prod = productMap.get(id);
    if (prod) {
      prod.display_position = idx + 1;
      prod.updated_at = new Date().toISOString();
    }
  });

  writeDevDb(db);
  return await getProducts();
}

// ======================== SECTIONS OPERATIONS ========================

export async function getSections(): Promise<StorefrontSection[]> {
  if (isPostgresConfigured()) {
    return await pgGetSections();
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  return [...db.sections].sort((a, b) => a.display_position - b.display_position);
}

export async function updateSection(id: string, updates: Partial<StorefrontSection>): Promise<StorefrontSection | null> {
  if (isPostgresConfigured()) {
    return await pgUpdateSection(id, updates);
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  const index = db.sections.findIndex((s) => s.id === id);
  if (index === -1) return null;

  db.sections[index] = {
    ...db.sections[index],
    ...updates,
    id: db.sections[index].id,
  };
  writeDevDb(db);
  return db.sections[index];
}

// ======================== ORDER OPERATIONS ========================

export async function getOrders(filters?: { status?: OrderStatus }): Promise<Order[]> {
  if (isPostgresConfigured()) {
    return await pgGetOrders(filters);
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  let list = [...db.orders];

  if (filters?.status) {
    list = list.filter((o) => o.status === filters.status);
  }

  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (isPostgresConfigured()) {
    return await pgGetOrderById(id);
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  return db.orders.find((o) => o.id === id) || null;
}

export async function createOrder(
  data: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'paymentMethod' | 'status'>
): Promise<Order> {
  if (isPostgresConfigured()) {
    return await pgCreateOrder(data);
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  const now = new Date().toISOString();
  
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const orderId = `KK-${dateStr}-${rand}`;

  const newOrder: Order = {
    id: orderId,
    customerName: data.customerName,
    mobile: data.mobile,
    address: data.address,
    items: data.items,
    totalAmount: data.totalAmount,
    paymentMethod: 'Cash on Delivery',
    status: 'NEW',
    createdAt: now,
    updatedAt: now,
  };

  db.orders.push(newOrder);
  writeDevDb(db);
  return newOrder;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  if (isPostgresConfigured()) {
    return await pgUpdateOrderStatus(id, status);
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  const index = db.orders.findIndex((o) => o.id === id);
  if (index === -1) return null;

  db.orders[index].status = status;
  db.orders[index].updatedAt = new Date().toISOString();
  writeDevDb(db);
  return db.orders[index];
}

// ======================== METRICS OPERATIONS ========================

export async function getMetrics(): Promise<AdminMetrics> {
  if (isPostgresConfigured()) {
    return await pgGetMetrics();
  }
  assertNoProductionJsonFallback();

  const db = readDevDb();
  const products = db.products;
  const orders = db.orders;

  return {
    totalProducts: products.length,
    basicProducts: products.filter((p) => p.module === 'BASIC').length,
    customizedProducts: products.filter((p) => p.module === 'CUSTOMIZED').length,
    personalizedProducts: products.filter((p) => p.module === 'PERSONALIZED').length,
    visibleProducts: products.filter((p) => p.is_visible).length,
    totalOrders: orders.length,
    newOrders: orders.filter((o) => o.status === 'NEW').length,
    preparingOrders: orders.filter((o) => o.status === 'PREPARING').length,
    deliveredOrders: orders.filter((o) => o.status === 'DELIVERED').length,
    cancelledOrders: orders.filter((o) => o.status === 'CANCELLED').length,
  };
}

