import { Pool, QueryResultRow } from 'pg';
import { Product, StorefrontSection, Order, OrderStatus, AdminMetrics, ProductModule } from '@/types';

let poolInstance: Pool | null = null;

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

export function getPool(): Pool {
  if (poolInstance) {
    return poolInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[Karkana Production] Fatal Error: DATABASE_URL is not configured. Silently falling back to local JSON persistence is strictly prohibited in production.'
      );
    }
    throw new Error('DATABASE_URL is not set.');
  }

  poolInstance = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return poolInstance;
}

export async function initPostgresSchema(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        brand VARCHAR(100) DEFAULT '',
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100) DEFAULT '',
        description TEXT DEFAULT '',
        short_description TEXT DEFAULT '',
        price NUMERIC(10, 2) NOT NULL,
        original_price NUMERIC(10, 2),
        raw_mrp VARCHAR(50),
        raw_selling_price VARCHAR(50),
        discount_percent VARCHAR(50),
        stock_quantity INTEGER,
        unit VARCHAR(50) DEFAULT '',
        images JSONB NOT NULL DEFAULT '[]',
        image_2 VARCHAR(255) DEFAULT '',
        image_3 VARCHAR(255) DEFAULT '',
        video VARCHAR(255) DEFAULT '',
        module VARCHAR(50) NOT NULL,
        display_position INTEGER NOT NULL DEFAULT 0,
        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
        is_popular BOOLEAN NOT NULL DEFAULT FALSE,
        is_visible BOOLEAN NOT NULL DEFAULT TRUE,
        in_stock BOOLEAN NOT NULL DEFAULT TRUE,
        search_keywords TEXT DEFAULT '',
        safety_instructions TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        image_width INTEGER,
        image_height INTEGER,
        aspect_ratio NUMERIC(10, 4),
        orientation VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_products_module ON products(module);
      CREATE INDEX IF NOT EXISTS idx_products_display_position ON products(display_position);
      CREATE INDEX IF NOT EXISTS idx_products_is_visible ON products(is_visible);

      CREATE TABLE IF NOT EXISTS sections (
        id VARCHAR(50) PRIMARY KEY,
        key VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        subtitle TEXT NOT NULL,
        is_visible BOOLEAN NOT NULL DEFAULT TRUE,
        display_position INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        address JSONB NOT NULL,
        items JSONB NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery',
        status VARCHAR(50) NOT NULL DEFAULT 'NEW',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    `);
  } finally {
    client.release();
  }
}

function mapProductRow(row: QueryResultRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand || '',
    category: row.category,
    subcategory: row.subcategory || '',
    description: row.description || '',
    short_description: row.short_description || '',
    price: Number(row.price),
    original_price: row.original_price != null ? Number(row.original_price) : undefined,
    raw_mrp: row.raw_mrp || undefined,
    raw_selling_price: row.raw_selling_price || undefined,
    discount_percent: row.discount_percent || undefined,
    stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : null,
    unit: row.unit || '',
    images: Array.isArray(row.images) ? row.images : typeof row.images === 'string' ? JSON.parse(row.images) : [],
    image_2: row.image_2 || '',
    image_3: row.image_3 || '',
    video: row.video || '',
    module: row.module as ProductModule,
    display_position: Number(row.display_position || 0),
    is_featured: Boolean(row.is_featured),
    is_popular: Boolean(row.is_popular),
    is_visible: Boolean(row.is_visible),
    in_stock: Boolean(row.in_stock),
    search_keywords: row.search_keywords || '',
    safety_instructions: row.safety_instructions || '',
    notes: row.notes || '',
    image_width: row.image_width != null ? Number(row.image_width) : undefined,
    image_height: row.image_height != null ? Number(row.image_height) : undefined,
    aspect_ratio: row.aspect_ratio != null ? Number(row.aspect_ratio) : undefined,
    orientation: row.orientation || undefined,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

function mapSectionRow(row: QueryResultRow): StorefrontSection {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    subtitle: row.subtitle,
    is_visible: Boolean(row.is_visible),
    display_position: Number(row.display_position),
  };
}

function mapOrderRow(row: QueryResultRow): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    mobile: row.mobile,
    address: typeof row.address === 'string' ? JSON.parse(row.address) : row.address,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    totalAmount: Number(row.total_amount),
    paymentMethod: 'Cash on Delivery',
    status: row.status as OrderStatus,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

// ======================== PRODUCT OPERATIONS (PG) ========================

export async function pgGetProducts(filters?: {
  module?: ProductModule;
  is_featured?: boolean;
  is_popular?: boolean;
  is_visible?: boolean;
  search?: string;
  category?: string;
}): Promise<Product[]> {
  const pool = getPool();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters?.module) {
    values.push(filters.module);
    conditions.push(`module = $${values.length}`);
  }
  if (filters?.is_featured !== undefined) {
    values.push(filters.is_featured);
    conditions.push(`is_featured = $${values.length}`);
  }
  if (filters?.is_popular !== undefined) {
    values.push(filters.is_popular);
    conditions.push(`is_popular = $${values.length}`);
  }
  if (filters?.is_visible !== undefined) {
    values.push(filters.is_visible);
    conditions.push(`is_visible = $${values.length}`);
  }
  if (filters?.category) {
    values.push(filters.category.toLowerCase());
    conditions.push(`LOWER(category) = $${values.length}`);
  }
  if (filters?.search) {
    values.push(`%${filters.search.toLowerCase()}%`);
    const p = values.length;
    conditions.push(`(LOWER(name) LIKE $${p} OR LOWER(description) LIKE $${p} OR LOWER(category) LIKE $${p})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT * FROM products
    ${whereClause}
    ORDER BY display_position ASC, created_at DESC
  `;

  const res = await pool.query(query, values);
  return res.rows.map(mapProductRow);
}

export async function pgGetProductById(id: string): Promise<Product | null> {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM products WHERE id = $1 LIMIT 1', [id]);
  if (!res.rows.length) return null;
  return mapProductRow(res.rows[0]);
}

export async function pgCreateProduct(
  data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'display_position'> & {
    display_position?: number;
  }
): Promise<Product> {
  const pool = getPool();
  const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  let position = data.display_position;
  if (position === undefined) {
    const maxRes = await pool.query('SELECT COALESCE(MAX(display_position), 0) as max_pos FROM products');
    position = Number(maxRes.rows[0].max_pos) + 1;
  }

  const query = `
    INSERT INTO products (
      id, name, brand, category, subcategory, description, short_description,
      price, original_price, raw_mrp, raw_selling_price, discount_percent,
      stock_quantity, unit, images, image_2, image_3, video, module,
      display_position, is_featured, is_popular, is_visible, in_stock,
      search_keywords, safety_instructions, notes, image_width, image_height,
      aspect_ratio, orientation, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18, $19,
      $20, $21, $22, $23, $24,
      $25, $26, $27, $28, $29,
      $30, $31, $32, $33
    ) RETURNING *
  `;

  const values = [
    id, data.name, data.brand || '', data.category, data.subcategory || '', data.description || '', data.short_description || '',
    data.price, data.original_price ?? null, data.raw_mrp ?? null, data.raw_selling_price ?? null, data.discount_percent ?? null,
    data.stock_quantity ?? null, data.unit || '', JSON.stringify(data.images || []), data.image_2 || '', data.image_3 || '', data.video || '', data.module,
    position, Boolean(data.is_featured), Boolean(data.is_popular), data.is_visible !== undefined ? Boolean(data.is_visible) : true, data.in_stock !== undefined ? Boolean(data.in_stock) : true,
    data.search_keywords || '', data.safety_instructions || '', data.notes || '', data.image_width ?? null, data.image_height ?? null,
    data.aspect_ratio ?? null, data.orientation ?? null, now, now
  ];

  const res = await pool.query(query, values);
  return mapProductRow(res.rows[0]);
}

export async function pgUpdateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const pool = getPool();
  const existing = await pgGetProductById(id);
  if (!existing) return null;

  const merged: Product = {
    ...existing,
    ...updates,
    id: existing.id,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };

  const query = `
    UPDATE products SET
      name = $2, brand = $3, category = $4, subcategory = $5, description = $6, short_description = $7,
      price = $8, original_price = $9, raw_mrp = $10, raw_selling_price = $11, discount_percent = $12,
      stock_quantity = $13, unit = $14, images = $15, image_2 = $16, image_3 = $17, video = $18, module = $19,
      display_position = $20, is_featured = $21, is_popular = $22, is_visible = $23, in_stock = $24,
      search_keywords = $25, safety_instructions = $26, notes = $27, image_width = $28, image_height = $29,
      aspect_ratio = $30, orientation = $31, updated_at = $32
    WHERE id = $1
    RETURNING *
  `;

  const values = [
    id, merged.name, merged.brand || '', merged.category, merged.subcategory || '', merged.description || '', merged.short_description || '',
    merged.price, merged.original_price ?? null, merged.raw_mrp ?? null, merged.raw_selling_price ?? null, merged.discount_percent ?? null,
    merged.stock_quantity ?? null, merged.unit || '', JSON.stringify(merged.images || []), merged.image_2 || '', merged.image_3 || '', merged.video || '', merged.module,
    merged.display_position, Boolean(merged.is_featured), Boolean(merged.is_popular), Boolean(merged.is_visible), Boolean(merged.in_stock),
    merged.search_keywords || '', merged.safety_instructions || '', merged.notes || '', merged.image_width ?? null, merged.image_height ?? null,
    merged.aspect_ratio ?? null, merged.orientation ?? null, merged.updated_at
  ];

  const res = await pool.query(query, values);
  return mapProductRow(res.rows[0]);
}

export async function pgDeleteProduct(id: string): Promise<boolean> {
  const pool = getPool();
  const res = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function pgReorderProducts(orderedIds: string[]): Promise<Product[]> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const now = new Date().toISOString();
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE products SET display_position = $1, updated_at = $2 WHERE id = $3',
        [i + 1, now, orderedIds[i]]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return await pgGetProducts();
}

// ======================== SECTIONS OPERATIONS (PG) ========================

export async function pgGetSections(): Promise<StorefrontSection[]> {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM sections ORDER BY display_position ASC');
  return res.rows.map(mapSectionRow);
}

export async function pgUpdateSection(id: string, updates: Partial<StorefrontSection>): Promise<StorefrontSection | null> {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM sections WHERE id = $1 LIMIT 1', [id]);
  if (!res.rows.length) return null;

  const existing = mapSectionRow(res.rows[0]);
  const merged: StorefrontSection = { ...existing, ...updates, id: existing.id };

  const updateRes = await pool.query(`
    UPDATE sections SET
      title = $2,
      subtitle = $3,
      is_visible = $4,
      display_position = $5
    WHERE id = $1
    RETURNING *
  `, [id, merged.title, merged.subtitle, merged.is_visible, merged.display_position]);

  return mapSectionRow(updateRes.rows[0]);
}

// ======================== ORDER OPERATIONS (PG) ========================

export async function pgGetOrders(filters?: { status?: OrderStatus }): Promise<Order[]> {
  const pool = getPool();
  let query = 'SELECT * FROM orders';
  const values: unknown[] = [];

  if (filters?.status) {
    values.push(filters.status);
    query += ' WHERE status = $1';
  }

  query += ' ORDER BY created_at DESC';

  const res = await pool.query(query, values);
  return res.rows.map(mapOrderRow);
}

export async function pgGetOrderById(id: string): Promise<Order | null> {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [id]);
  if (!res.rows.length) return null;
  return mapOrderRow(res.rows[0]);
}

export async function pgCreateOrder(
  data: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'paymentMethod' | 'status'>
): Promise<Order> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const now = new Date().toISOString();
    const dateStr = now.slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderId = `KK-${dateStr}-${rand}`;

    const query = `
      INSERT INTO orders (
        id, customer_name, mobile, address, items, total_amount, payment_method, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      orderId,
      data.customerName,
      data.mobile,
      JSON.stringify(data.address),
      JSON.stringify(data.items),
      data.totalAmount,
      'Cash on Delivery',
      'NEW',
      now,
      now,
    ];

    const res = await client.query(query, values);
    await client.query('COMMIT');
    return mapOrderRow(res.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function pgUpdateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  const pool = getPool();
  const now = new Date().toISOString();
  const res = await pool.query(
    'UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
    [status, now, id]
  );
  if (!res.rows.length) return null;
  return mapOrderRow(res.rows[0]);
}

// ======================== METRICS OPERATIONS (PG) ========================

export async function pgGetMetrics(): Promise<AdminMetrics> {
  const pool = getPool();
  const productsRes = await pool.query('SELECT module, is_visible FROM products');
  const ordersRes = await pool.query('SELECT status FROM orders');

  const products = productsRes.rows;
  const orders = ordersRes.rows;

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

