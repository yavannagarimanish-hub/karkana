import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type { Customer, CustomerAddress } from '@/core/domain/account';
import type { CatalogueSection } from '@/core/domain/catalogue';
import type { Order } from '@/core/domain/order';
import type { Product } from '@/core/domain/product';
import {
  normalizeAddress,
  normalizeCustomer,
  normalizeOrder,
  normalizeProduct,
  normalizeSection,
  normalizeWishlist,
  type WishlistEntry,
} from '../normalize';

export const DEFAULT_DB_PATH = path.join(process.cwd(), 'data', 'karkana.db.json');

/**
 * Overridable so a smoke test or a scratch environment can point the JSON
 * adapter at a copy and never rewrite the committed catalogue.
 */
export function resolveDbPath(): string {
  const override = process.env.KARKANA_DB_PATH;
  if (override && override.trim().length > 0) return path.resolve(process.cwd(), override.trim());
  return DEFAULT_DB_PATH;
}

export interface JsonSnapshot {
  products: Product[];
  sections: CatalogueSection[];
  orders: Order[];
  customers: Customer[];
  addresses: CustomerAddress[];
  wishlist: WishlistEntry[];
}

export const DEFAULT_SECTIONS: CatalogueSection[] = [
  {
    id: 'sec-popular',
    key: 'popular',
    title: 'POPULAR CRACKERS',
    subtitle: 'MOST DEMANDED FORMULATIONS OF THE SEASON',
    isVisible: true,
    displayPosition: 1,
  },
  {
    id: 'sec-featured',
    key: 'featured',
    title: 'FEATURED PRODUCTS',
    subtitle: 'CURATED EDITIONS OF PYROTECHNIC ARTISTRY',
    isVisible: true,
    displayPosition: 2,
  },
  {
    id: 'sec-basic',
    key: 'basic',
    title: 'BASIC CATALOGUE',
    subtitle: 'ESSENTIAL CELEBRATION CLASSICS',
    isVisible: true,
    displayPosition: 3,
  },
  {
    id: 'sec-customized',
    key: 'customized',
    title: 'CUSTOMIZED CATALOGUE',
    subtitle: 'ICONIC THEMATIC PACKAGING EDITIONS',
    isVisible: true,
    displayPosition: 4,
  },
  {
    id: 'sec-personalized',
    key: 'personalized',
    title: 'PERSONALIZED CATALOGUE',
    subtitle: 'BESPOKE BOXES FEATURING YOUR PHOTOGRAPHY',
    isVisible: true,
    displayPosition: 5,
  },
];

function emptySnapshot(): JsonSnapshot {
  return {
    products: [],
    sections: DEFAULT_SECTIONS.map((section) => ({ ...section })),
    orders: [],
    customers: [],
    addresses: [],
    wishlist: [],
  };
}

/**
 * File-backed store used in development. Writes are serialised through a
 * promise chain and committed with a tmp-file + rename, so a crash can never
 * leave a truncated database behind.
 */
export class JsonStore {
  private snapshot: JsonSnapshot | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string = resolveDbPath()) {
    // Blocked at production *runtime*. The build phase is allowed through so
    // `next build` can compile and type-check without a database attached;
    // every data-dependent route is dynamic, so nothing is served from here.
    const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
    if (process.env.NODE_ENV === 'production' && !isBuild) {
      throw new Error(
        '[karkana] The JSON store is a development-only adapter. ' +
          'Set DATABASE_URL to use Postgres in production.',
      );
    }
  }

  get path(): string {
    return this.filePath;
  }

  private async load(): Promise<JsonSnapshot> {
    if (this.snapshot) return this.snapshot;

    let raw: string;
    try {
      raw = await fsp.readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.snapshot = emptySnapshot();
        return this.snapshot;
      }
      throw error;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch (error) {
      throw new Error(`[karkana] ${this.filePath} is not valid JSON: ${(error as Error).message}`);
    }

    const arrays = {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      addresses: Array.isArray(parsed.addresses) ? parsed.addresses : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
    };

    this.snapshot = {
      products: arrays.products.map((item) => normalizeProduct(item as Record<string, unknown>)),
      sections:
        arrays.sections.length > 0
          ? arrays.sections.map((item) => normalizeSection(item as Record<string, unknown>))
          : DEFAULT_SECTIONS.map((section) => ({ ...section })),
      orders: arrays.orders.map((item) => normalizeOrder(item as Record<string, unknown>)),
      customers: arrays.customers.map((item) => normalizeCustomer(item as Record<string, unknown>)),
      addresses: arrays.addresses.map((item) => normalizeAddress(item as Record<string, unknown>)),
      wishlist: normalizeWishlist(arrays.wishlist),
    };

    return this.snapshot;
  }

  /** Read a consistent copy of the whole store. */
  async read(): Promise<JsonSnapshot> {
    const snapshot = await this.load();
    return structuredClone(snapshot);
  }

  /**
   * Mutate the store. The callback receives the live snapshot and returns the
   * value the caller wants back; the result is persisted before resolving.
   */
  async write<T>(mutate: (snapshot: JsonSnapshot) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const snapshot = await this.load();
      const result = mutate(snapshot);
      await this.persist(snapshot);
      return result;
    });

    // Keep the chain alive even if this write fails.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async persist(snapshot: JsonSnapshot): Promise<void> {
    const serialised = JSON.stringify(
      {
        version: 2,
        updatedAt: new Date().toISOString(),
        products: snapshot.products,
        sections: snapshot.sections,
        orders: snapshot.orders,
        customers: snapshot.customers,
        addresses: snapshot.addresses,
        wishlist: snapshot.wishlist,
      },
      null,
      2,
    );

    await fsp.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.${process.pid}.tmp`;
    await fsp.writeFile(tmpPath, serialised, 'utf8');
    await fsp.rename(tmpPath, this.filePath);
  }

  /** Drops the in-memory copy so the next read hits the disk. */
  invalidate(): void {
    this.snapshot = null;
  }

  exists(): boolean {
    return fs.existsSync(this.filePath);
  }
}

let sharedInstance: JsonStore | null = null;

export function getJsonStore(): JsonStore {
  sharedInstance ??= new JsonStore();
  return sharedInstance;
}
