import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression suite for the wiring between env alias resolution and the
 * Postgres adapter. Deployments that only define prefixed variables
 * (`karkana_DATABASE_URL`, `karkana_POSTGRES_URL_NON_POOLING`, `karkana_PGHOST`,
 * …) must still reach Postgres: `getDb()` used to default to the raw
 * `process.env.DATABASE_URL`, which those deployments never set, so every
 * DB request threw even though `resolveAliases()` had populated
 * `env.DATABASE_URL`. The `pg` driver and drizzle are mocked so the test
 * observes exactly which connection string the client hands to `Pool`.
 */

const { poolConfigs, drizzleMock, migrateMock } = vi.hoisted(() => ({
  poolConfigs: [] as Array<Record<string, unknown>>,
  drizzleMock: vi.fn(),
  migrateMock: vi.fn(),
}));

vi.mock('pg', () => ({
  Pool: class {
    constructor(config: Record<string, unknown>) {
      poolConfigs.push(config);
    }

    end = async (): Promise<void> => undefined;
  },
}));

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: (pool: unknown, options?: unknown) => {
    drizzleMock(pool, options);
    return { driver: 'pg-mock' };
  },
}));

vi.mock('drizzle-orm/node-postgres/migrator', () => ({
  migrate: (...args: unknown[]) => migrateMock(...args),
}));

const ENV_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_URL_NO_SSL',
  'PGHOST',
  'PGHOST_UNPOOLED',
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
  'PGPORT',
  'POSTGRES_HOST',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DATABASE',
];

const ALL_ENV_KEYS = ENV_KEYS.flatMap((key) => [key, `karkana_${key}`]);

const env = process.env as Record<string, string | undefined>;

function clearDbEnv(): void {
  for (const key of ALL_ENV_KEYS) delete env[key];
}

/** The client memoises its pool and `env` is parsed at import time, so each
 *  test loads a fresh module stack against a fresh environment. */
async function loadGetDb() {
  vi.resetModules();
  const client = await import('../client');
  return client;
}

describe('pg client getDb', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const key of ALL_ENV_KEYS) savedEnv[key] = env[key];
    clearDbEnv();
    poolConfigs.length = 0;
    drizzleMock.mockClear();
    migrateMock.mockClear();
  });

  afterEach(() => {
    clearDbEnv();
    for (const key of ALL_ENV_KEYS) {
      const value = savedEnv[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
    vi.resetModules();
  });

  it('uses env.DATABASE_URL resolved from prefixed karkana_* variables', async () => {
    // The Vercel production setup: every variable is karkana_-prefixed, so
    // plain DATABASE_URL is never set. Before the fix getDb() threw here.
    env.karkana_DATABASE_URL = 'postgres://karkana-db.example.com/karkana';
    const { getDb } = await loadGetDb();

    const db = getDb();

    expect(db).toEqual({ driver: 'pg-mock' });
    expect(poolConfigs).toHaveLength(1);
    expect(poolConfigs[0]).toMatchObject({
      connectionString: 'postgres://karkana-db.example.com/karkana',
    });
  });

  it('falls back to the Neon/Vercel template variables when DATABASE_URL is absent', async () => {
    // The exact reproduction environment: PGHOST, POSTGRES_URL_NON_POOLING and
    // DATABASE_URL_UNPOOLED under the karkana_ prefix, nothing else.
    env.karkana_PGHOST = 'pg.internal';
    env.karkana_POSTGRES_URL_NON_POOLING = 'postgres://direct.example.com/karkana';
    env.karkana_DATABASE_URL_UNPOOLED = 'postgres://unpooled.example.com/karkana';
    const { getDb } = await loadGetDb();

    getDb();

    expect(poolConfigs).toHaveLength(1);
    expect(poolConfigs[0]).toMatchObject({
      connectionString: 'postgres://unpooled.example.com/karkana',
    });
  });

  it('composes a connection string from libpq parameters when no URL is set', async () => {
    env.karkana_PGHOST = 'pg.internal';
    env.karkana_PGUSER = 'app';
    env.karkana_PGPASSWORD = 'p@ss:w/rd';
    env.karkana_PGDATABASE = 'karkana';
    env.karkana_PGPORT = '5432';
    const { getDb } = await loadGetDb();

    getDb();

    expect(poolConfigs).toHaveLength(1);
    expect(poolConfigs[0]).toMatchObject({
      connectionString: 'postgresql://app:p%40ss%3Aw%2Frd@pg.internal:5432/karkana',
    });
  });

  it('prefers the plain DATABASE_URL over prefixed and aliased variables', async () => {
    env.DATABASE_URL = 'postgres://canonical.example.com/karkana';
    env.karkana_DATABASE_URL = 'postgres://prefixed.example.com/karkana';
    env.POSTGRES_URL = 'postgres://aliased.example.com/karkana';
    const { getDb } = await loadGetDb();

    getDb();

    expect(poolConfigs).toHaveLength(1);
    expect(poolConfigs[0]).toMatchObject({
      connectionString: 'postgres://canonical.example.com/karkana',
    });
  });

  it('prefers an explicit connection string over the environment', async () => {
    env.karkana_DATABASE_URL = 'postgres://karkana-db.example.com/karkana';
    const { getDb } = await loadGetDb();

    getDb('postgres://explicit.example.com/karkana');

    expect(poolConfigs).toHaveLength(1);
    expect(poolConfigs[0]).toMatchObject({
      connectionString: 'postgres://explicit.example.com/karkana',
    });
  });

  it('throws a clear error when no database URL is configured anywhere', async () => {
    const { getDb } = await loadGetDb();

    expect(() => getDb()).toThrow(/DATABASE_URL is not set/);
    expect(poolConfigs).toHaveLength(0);
  });
});
