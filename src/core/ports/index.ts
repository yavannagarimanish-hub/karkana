import type { CatalogueSection } from '../domain/catalogue';
import type { Customer, CustomerAddress } from '../domain/account';
import type { Order, OrderStatus } from '../domain/order';
import type { Product, ProductInput, ProductModule } from '../domain/product';

/**
 * Ports — the only way the application layer touches the outside world.
 * Postgres, the JSON dev file, S3 and the system clock all implement these.
 */

export interface ProductListFilter {
  module?: ProductModule | null;
  category?: string | null;
  /** `true` for the admin catalogue, which must see hidden products. */
  includeHidden?: boolean;
  featured?: boolean;
  popular?: boolean;
}

export interface ProductRepository {
  list(filter?: ProductListFilter): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  findByIds(ids: readonly string[]): Promise<Product[]>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, patch: Partial<ProductInput>): Promise<Product | null>;
  remove(id: string): Promise<boolean>;
  /** Persist a new display order. `ids` is the full ordered catalogue. */
  reorder(ids: readonly string[]): Promise<void>;
  /** Next free catalogue id, e.g. `KRK139`. */
  nextId(): Promise<string>;
}

export type SectionPatch = Partial<Pick<CatalogueSection, 'title' | 'subtitle' | 'isVisible' | 'displayPosition'>>;

export interface SectionRepository {
  list(): Promise<CatalogueSection[]>;
  update(id: string, patch: SectionPatch): Promise<CatalogueSection | null>;
}

export interface OrderListFilter {
  status?: OrderStatus | null;
  customerId?: string | null;
  limit?: number;
}

export interface OrderMetrics {
  total: number;
  byStatus: Record<OrderStatus, number>;
  revenuePaise: number;
  awaitingAction: number;
}

export interface OrderRepository {
  create(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  list(filter?: OrderListFilter): Promise<Order[]>;
  updateStatus(id: string, status: OrderStatus, at: Date): Promise<Order | null>;
  metrics(): Promise<OrderMetrics>;
}

export interface NewCustomer {
  id: string;
  email: string;
  name: string;
  phone: string;
  passwordHash: string;
  now: Date;
}

export interface NewAddress {
  id: string;
  customerId: string;
  label: string;
  houseFlat: string;
  streetLocality: string;
  city: string;
  state: string;
  pincode: string;
  instructions: string;
  isDefault: boolean;
  now: Date;
}

export interface CustomerRepository {
  findByEmail(email: string): Promise<Customer | null>;
  findById(id: string): Promise<Customer | null>;
  create(input: NewCustomer): Promise<Customer>;
  recordLogin(id: string, at: Date): Promise<void>;
  updatePassword(id: string, passwordHash: string, at: Date): Promise<void>;

  listAddresses(customerId: string): Promise<CustomerAddress[]>;
  createAddress(input: NewAddress): Promise<CustomerAddress>;
  updateAddress(
    customerId: string,
    addressId: string,
    patch: Partial<Omit<NewAddress, 'id' | 'customerId' | 'now'>>,
  ): Promise<CustomerAddress | null>;
  removeAddress(customerId: string, addressId: string): Promise<boolean>;

  wishlist(customerId: string): Promise<Product[]>;
  isWishlisted(customerId: string, productId: string): Promise<boolean>;
  /** Returns the new state: `true` = now on the wishlist. */
  toggleWishlist(customerId: string, productId: string): Promise<boolean>;
}

export interface StoredObject {
  url: string;
  key: string;
  size: number;
}

export interface ObjectStorage {
  isConfigured(): boolean;
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
}

/** Password hashing is a port so the algorithm can be tested and rotated. */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface Clock {
  now(): Date;
  iso(): string;
}

export interface IdGenerator {
  customer(): string;
  address(): string;
  order(): string;
  product(): string;
}

export interface Repositories {
  products: ProductRepository;
  sections: SectionRepository;
  orders: OrderRepository;
  customers: CustomerRepository;
  storage: ObjectStorage;
  passwords: PasswordHasher;
  clock: Clock;
  ids: IdGenerator;
  /** `'postgres' | 'json'` — surfaced on the admin dashboard. */
  readonly driver: string;
}
