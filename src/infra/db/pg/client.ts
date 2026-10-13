import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import path from 'node:path';
import { env } from '../../env';
import * as schema from '../schema';

export type Db = NodePgDatabase<typeof schema>;

let schemaEnsured = false;
let schemaEnsuringPromise: Promise<void> | null = null;

export async function ensureSchemaInitialized(instance: Db): Promise<void> {
  if (schemaEnsured) return;
  if (schemaEnsuringPromise) return schemaEnsuringPromise;

  schemaEnsuringPromise = (async () => {
    try {
      await instance.execute(sql`
        CREATE TABLE IF NOT EXISTS uploaded_images (
          id varchar(50) PRIMARY KEY,
          storage_key varchar(500) NOT NULL UNIQUE,
          token varchar(100) NOT NULL,
          original_filename varchar(255),
          mime_type varchar(100) NOT NULL,
          size_bytes integer NOT NULL,
          kind varchar(50) NOT NULL DEFAULT 'personalization',
          order_id varchar(20),
          customer_id varchar(40),
          created_at timestamp with time zone NOT NULL DEFAULT now()
        );
      `);
      await instance.execute(sql`CREATE INDEX IF NOT EXISTS uploaded_images_token_idx ON uploaded_images(token);`);
      await instance.execute(sql`CREATE INDEX IF NOT EXISTS uploaded_images_order_idx ON uploaded_images(order_id);`);

      await instance.execute(sql`
        CREATE TABLE IF NOT EXISTS order_items (
          id varchar(60) PRIMARY KEY,
          order_id varchar(20) NOT NULL,
          product_id varchar(50) NOT NULL,
          product_name varchar(200) NOT NULL,
          product_image text,
          module varchar(30) NOT NULL DEFAULT 'BASIC',
          unit_price_paise integer NOT NULL,
          quantity integer NOT NULL,
          line_total_paise integer NOT NULL,
          personalization_image text,
          customization_notes text,
          variant_label varchar(100),
          parent_title varchar(200),
          created_at timestamp with time zone NOT NULL DEFAULT now()
        );
      `);
      await instance.execute(sql`CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);`);

      await instance.execute(sql`
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id varchar(40);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_paise integer DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS fees_paise integer DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_paise integer DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_paise integer DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status varchar(30) DEFAULT 'PENDING';
      `);

      schemaEnsured = true;
    } catch (err) {
      console.error('[karkana] schema init notice:', err);
    } finally {
      schemaEnsuringPromise = null;
    }
  })();

  return schemaEnsuringPromise;
}

let pool: Pool | null = null;
let db: Db | null = null;

/**
 * Defaults to `env.DATABASE_URL` — the value resolved by `resolveAliases()`
 * (which also accepts the `karkana_*`-prefixed Neon/Vercel names) — NOT the
 * raw `process.env.DATABASE_URL`, which prefixed deployments never set.
 */
export function getDb(connectionString = env.DATABASE_URL): Db {
  if (db) return db;

  if (!connectionString) {
    throw new Error(
      '[karkana] DATABASE_URL is not set. It is required for the Postgres adapter ' +
        '(and mandatory in production).',
    );
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  db = drizzle(pool, { schema });
  return db;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = null;
  db = null;
}

/** Applies the generated SQL in `drizzle/` (produced by `npm run db:generate`). */
export async function runMigrations(connectionString?: string): Promise<void> {
  const instance = getDb(connectionString);
  await migrate(instance, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
}
