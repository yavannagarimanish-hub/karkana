import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';
import { env } from '../../env';
import * as schema from '../schema';

export type Db = NodePgDatabase<typeof schema>;

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
