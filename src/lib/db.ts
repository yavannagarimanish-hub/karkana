import fs from 'fs';
import path from 'path';
import { Product, StorefrontSection, Order, OrderStatus, AdminMetrics, ProductModule } from '@/types';

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

function ensureDbFile(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      products: [], // STRICT: Zero demo products
      sections: DEFAULT_SECTIONS,
      orders: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDb(): DatabaseSchema {
  ensureDbFile();
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
    console.error('Failed reading database file, returning fallback:', error);
    return {
      products: [],
      sections: DEFAULT_SECTIONS,
      orders: [],
    };
  }
}

function writeDb(data: DatabaseSchema): void {
  ensureDbFile();
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// ======================== PRODUCT OPERATIONS ========================

export function getProducts(filters?: {
  module?: ProductModule;
  is_featured?: boolean;
  is_popular?: boolean;
  is_visible?: boolean;
  search?: string;
  category?: string;
}): Product[] {
  const db = readDb();
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

export function getProductById(id: string): Product | null {
  const db = readDb();
  return db.products.find((p) => p.id === id) || null;
}

export function createProduct(
  data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'display_position'> & {
    display_position?: number;
  }
): Product {
  const db = readDb();
  const now = new Date().toISOString();
  
  // Calculate next position if not specified
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
  writeDb(db);
  return newProduct;
}

export function updateProduct(id: string, updates: Partial<Product>): Product | null {
  const db = readDb();
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const existing = db.products[index];
  const updated: Product = {
    ...existing,
    ...updates,
    id: existing.id, // Immutable
    created_at: existing.created_at, // Immutable
    updated_at: new Date().toISOString(),
  };

  db.products[index] = updated;
  writeDb(db);
  return updated;
}

export function deleteProduct(id: string): boolean {
  const db = readDb();
  const initialLength = db.products.length;
  db.products = db.products.filter((p) => p.id !== id);
  if (db.products.length !== initialLength) {
    writeDb(db);
    return true;
  }
  return false;
}

export function reorderProducts(orderedIds: string[]): Product[] {
  const db = readDb();
  const productMap = new Map(db.products.map((p) => [p.id, p]));

  // Update positions for the ordered slice
  orderedIds.forEach((id, idx) => {
    const prod = productMap.get(id);
    if (prod) {
      prod.display_position = idx + 1;
      prod.updated_at = new Date().toISOString();
    }
  });

  writeDb(db);
  return getProducts();
}

// ======================== SECTIONS OPERATIONS ========================

export function getSections(): StorefrontSection[] {
  const db = readDb();
  return [...db.sections].sort((a, b) => a.display_position - b.display_position);
}

export function updateSection(id: string, updates: Partial<StorefrontSection>): StorefrontSection | null {
  const db = readDb();
  const index = db.sections.findIndex((s) => s.id === id);
  if (index === -1) return null;

  db.sections[index] = {
    ...db.sections[index],
    ...updates,
    id: db.sections[index].id,
  };
  writeDb(db);
  return db.sections[index];
}

// ======================== ORDER OPERATIONS ========================

export function getOrders(filters?: { status?: OrderStatus }): Order[] {
  const db = readDb();
  let list = [...db.orders];

  if (filters?.status) {
    list = list.filter((o) => o.status === filters.status);
  }

  // Newest orders first
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOrderById(id: string): Order | null {
  const db = readDb();
  return db.orders.find((o) => o.id === id) || null;
}

export function createOrder(
  data: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'paymentMethod' | 'status'>
): Order {
  const db = readDb();
  const now = new Date().toISOString();
  
  // Format readable order id: KK-YYYYMMDD-XXXX
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
  writeDb(db);
  return newOrder;
}

export function updateOrderStatus(id: string, status: OrderStatus): Order | null {
  const db = readDb();
  const index = db.orders.findIndex((o) => o.id === id);
  if (index === -1) return null;

  db.orders[index].status = status;
  db.orders[index].updatedAt = new Date().toISOString();
  writeDb(db);
  return db.orders[index];
}

// ======================== METRICS OPERATIONS ========================

export function getMetrics(): AdminMetrics {
  const db = readDb();
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
