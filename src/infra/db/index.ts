import type { Repositories } from '@/core/ports';
import { createServices, type Services } from '@/core/services';
import { isPostgresConfigured, pricingPolicyFromEnv } from '../env';
import { passwordHasher } from '../auth/password';
import { createObjectStorage } from '../storage';
import { systemClock, systemIds } from '../system';
import { getJsonStore } from './json/store';
import {
  createJsonCustomerRepository,
  createJsonImageRepository,
  createJsonOrderRepository,
  createJsonProductRepository,
  createJsonSectionRepository,
} from './json/repositories';

function jsonRepositories(): Repositories {
  const store = getJsonStore();
  return {
    products: createJsonProductRepository(store),
    sections: createJsonSectionRepository(store),
    orders: createJsonOrderRepository(store),
    customers: createJsonCustomerRepository(store),
    images: createJsonImageRepository(store),
    storage: createObjectStorage(),
    passwords: passwordHasher,
    clock: systemClock,
    ids: systemIds,
    driver: 'json',
  };
}

async function postgresRepositories(): Promise<Repositories> {
  // Imported lazily so `pg` is never loaded in a JSON-only process.
  const { getDb, ensureSchemaInitialized } = await import('./pg/client');
  const {
    createPgCustomerRepository,
    createPgImageRepository,
    createPgOrderRepository,
    createPgProductRepository,
    createPgSectionRepository,
  } = await import('./pg/repositories');

  const db = getDb();
  await ensureSchemaInitialized(db);

  return {
    products: createPgProductRepository(db),
    sections: createPgSectionRepository(db),
    orders: createPgOrderRepository(db),
    customers: createPgCustomerRepository(db),
    images: createPgImageRepository(db),
    storage: createObjectStorage(),
    passwords: passwordHasher,
    clock: systemClock,
    ids: systemIds,
    driver: 'postgres',
  };
}

let repositoriesPromise: Promise<Repositories> | null = null;

/** Single process-wide repository set, chosen once by configuration. */
export function getRepositories(): Promise<Repositories> {
  repositoriesPromise ??= isPostgresConfigured() ? postgresRepositories() : Promise.resolve(jsonRepositories());
  return repositoriesPromise;
}

let servicesPromise: Promise<Services> | null = null;

/** The app's composition root. */
export function getAppServices(): Promise<Services> {
  servicesPromise ??= getRepositories().then((repos) => createServices(repos, pricingPolicyFromEnv()));
  return servicesPromise;
}

/** Test hook: rebuild repositories against a fake or a temp JSON file. */
export function resetRepositories(): void {
  repositoriesPromise = null;
  servicesPromise = null;
}
