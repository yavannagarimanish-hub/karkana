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
import { type CatalogueSection, compareProductPositions } from '@/core/domain/catalogue';
import {
  ORDER_STATUSES,
  paymentStatusFor,
  type Order,
  type OrderStatus,
} from '@/core/domain/order';
import type { Product, ProductInput } from '@/core/domain/product';
import type { JsonStore } from './store';

function matchesProductFilter(product: Product, filter: ProductListFilter = {}): boolean {
  if (!filter.includeHidden && !product.isVisible) return false;
  if (filter.module && product.module !== filter.module) return false;
  if (filter.category && product.category !== filter.category) return false;
  if (filter.featured && !product.isFeatured) return false;
  if (filter.popular && !product.isPopular) return false;
  return true;
}

function toStoredProduct(input: ProductInput, id: string, now: string): Product {
  return {
    id,
    name: input.name,
    brand: input.brand ?? '',
    category: input.category ?? '',
    subcategory: input.subcategory ?? '',
    description: input.description ?? '',
    shortDescription: input.shortDescription ?? '',
    price: input.price,
    originalPrice: input.originalPrice ?? null,
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
    createdAt: now,
    updatedAt: now,
  };
}

function nextCatalogueId(products: readonly Product[]): string {
  let highest = 0;
  for (const product of products) {
    const match = /^KRK(\d+)$/.exec(product.id);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `KRK${String(highest + 1).padStart(3, '0')}`;
}

export function createJsonProductRepository(store: JsonStore): ProductRepository {
  return {
    async list(filter = {}) {
      const { products } = await store.read();
      return products
        .filter((product) => matchesProductFilter(product, filter))
        .sort(compareProductPositions);
    },

    async findById(id) {
      const { products } = await store.read();
      return products.find((product) => product.id === id) ?? null;
    },

    async findByIds(ids) {
      const wanted = new Set(ids);
      const { products } = await store.read();
      return products.filter((product) => wanted.has(product.id));
    },

    create(input) {
      const now = new Date().toISOString();
      return store.write((snapshot) => {
        const id = input.id ?? nextCatalogueId(snapshot.products);
        if (snapshot.products.some((product) => product.id === id)) {
          throw new Error(`Product ${id} already exists.`);
        }
        const inModule = snapshot.products.filter((p) => p.module === input.module);
        const maxPos = inModule.reduce((max, product) => Math.max(max, product.displayPosition ?? 0), 0);
        const position = input.displayPosition && input.displayPosition > 0 ? input.displayPosition : maxPos + 1;

        const product = toStoredProduct({ ...input, displayPosition: position }, id, now);
        snapshot.products.push(product);
        return structuredClone(product);
      });
    },

    update(id, patch) {
      const now = new Date().toISOString();
      return store.write((snapshot) => {
        const index = snapshot.products.findIndex((product) => product.id === id);
        if (index === -1) return null;

        const current = snapshot.products[index]!;
        const updated: Product = {
          ...current,
          ...(patch as Partial<Product>),
          id: current.id,
          createdAt: current.createdAt,
          updatedAt: now,
        };
        snapshot.products[index] = updated;
        return structuredClone(updated);
      });
    },

    async remove(id) {
      return store.write((snapshot) => {
        const before = snapshot.products.length;
        snapshot.products = snapshot.products.filter((product) => product.id !== id);
        snapshot.wishlist = snapshot.wishlist.filter((entry) => entry.productId !== id);
        return snapshot.products.length < before;
      });
    },

    async reorder(ids) {
      await store.write((snapshot) => {
        const positionById = new Map(ids.map((id, index) => [id, index + 1]));
        for (const product of snapshot.products) {
          const position = positionById.get(product.id);
          if (position !== undefined) product.displayPosition = position;
        }
      });
    },

    async nextId() {
      const { products } = await store.read();
      return nextCatalogueId(products);
    },
  };
}

export function createJsonSectionRepository(store: JsonStore): SectionRepository {
  return {
    async list() {
      const { sections } = await store.read();
      return [...sections].sort((a, b) => a.displayPosition - b.displayPosition);
    },

    update(id, patch: SectionPatch) {
      return store.write((snapshot) => {
        const index = snapshot.sections.findIndex((section) => section.id === id);
        if (index === -1) return null;

        const updated: CatalogueSection = { ...snapshot.sections[index]!, ...patch, id };
        snapshot.sections[index] = updated;
        return structuredClone(updated);
      });
    },
  };
}

export function createJsonOrderRepository(store: JsonStore): OrderRepository {
  return {
    async create(order) {
      return store.write((snapshot) => {
        snapshot.orders.unshift(structuredClone(order));
        return structuredClone(order);
      });
    },

    async findById(id) {
      const { orders } = await store.read();
      return orders.find((order) => order.id === id) ?? null;
    },

    async list(filter: OrderListFilter = {}) {
      const { orders } = await store.read();
      return orders
        .filter((order) => (filter.status ? order.status === filter.status : true))
        .filter((order) => (filter.customerId ? order.customerId === filter.customerId : true))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, filter.limit ?? orders.length);
    },

    updateStatus(id, status: OrderStatus, at: Date) {
      return store.write((snapshot) => {
        const index = snapshot.orders.findIndex((order) => order.id === id);
        if (index === -1) return null;

        const current = snapshot.orders[index]!;
        const updated: Order = {
          ...current,
          status,
          paymentStatus: paymentStatusFor(current.paymentMethod, status),
          updatedAt: at.toISOString(),
        };
        snapshot.orders[index] = updated;
        return structuredClone(updated);
      });
    },

    async metrics() {
      const { orders } = await store.read();
      const byStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<
        OrderStatus,
        number
      >;

      let revenuePaise = 0;
      for (const order of orders) {
        byStatus[order.status] += 1;
        if (order.status !== 'CANCELLED') revenuePaise += order.totalPaise;
      }

      const metrics: OrderMetrics = {
        total: orders.length,
        byStatus,
        revenuePaise,
        awaitingAction: byStatus.NEW + byStatus.CONFIRMED + byStatus.PREPARING,
      };
      return metrics;
    },
  };
}

export function createJsonCustomerRepository(store: JsonStore): CustomerRepository {
  return {
    async findByEmail(email) {
      const needle = email.trim().toLowerCase();
      const { customers } = await store.read();
      return customers.find((customer) => customer.email === needle) ?? null;
    },

    async findById(id) {
      const { customers } = await store.read();
      return customers.find((customer) => customer.id === id) ?? null;
    },

    create(input: NewCustomer) {
      return store.write((snapshot) => {
        const now = input.now.toISOString();
        const customer: Customer = {
          id: input.id,
          email: input.email,
          name: input.name,
          phone: input.phone,
          passwordHash: input.passwordHash,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: null,
        };
        snapshot.customers.push(customer);
        return structuredClone(customer);
      });
    },

    async recordLogin(id, at) {
      await store.write((snapshot) => {
        const customer = snapshot.customers.find((entry) => entry.id === id);
        if (customer) customer.lastLoginAt = at.toISOString();
      });
    },

    async updatePassword(id, passwordHash, at) {
      await store.write((snapshot) => {
        const customer = snapshot.customers.find((entry) => entry.id === id);
        if (customer) {
          customer.passwordHash = passwordHash;
          customer.updatedAt = at.toISOString();
        }
      });
    },

    async listAddresses(customerId) {
      const { addresses } = await store.read();
      return addresses
        .filter((address) => address.customerId === customerId)
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt.localeCompare(b.createdAt));
    },

    createAddress(input: NewAddress) {
      return store.write((snapshot) => {
        const address: CustomerAddress = {
          id: input.id,
          customerId: input.customerId,
          label: input.label,
          houseFlat: input.houseFlat,
          streetLocality: input.streetLocality,
          city: input.city,
          state: input.state,
          pincode: input.pincode,
          instructions: input.instructions,
          isDefault: input.isDefault || snapshot.addresses.filter((a) => a.customerId === input.customerId).length === 0,
          createdAt: input.now.toISOString(),
        };

        if (address.isDefault) {
          for (const existing of snapshot.addresses) {
            if (existing.customerId === input.customerId) existing.isDefault = false;
          }
        }

        snapshot.addresses.push(address);
        return structuredClone(address);
      });
    },

    updateAddress(customerId, addressId, patch) {
      return store.write((snapshot) => {
        const index = snapshot.addresses.findIndex(
          (address) => address.id === addressId && address.customerId === customerId,
        );
        if (index === -1) return null;

        const updated: CustomerAddress = { ...snapshot.addresses[index]!, ...patch, id: addressId, customerId };
        snapshot.addresses[index] = updated;

        if (updated.isDefault) {
          for (const existing of snapshot.addresses) {
            if (existing.customerId === customerId && existing.id !== addressId) existing.isDefault = false;
          }
        }

        return structuredClone(updated);
      });
    },

    async removeAddress(customerId, addressId) {
      return store.write((snapshot) => {
        const before = snapshot.addresses.length;
        snapshot.addresses = snapshot.addresses.filter(
          (address) => !(address.id === addressId && address.customerId === customerId),
        );
        return snapshot.addresses.length < before;
      });
    },

    async wishlist(customerId) {
      const { wishlist, products } = await store.read();
      const ids = wishlist.filter((entry) => entry.customerId === customerId).map((entry) => entry.productId);
      const idSet = new Set(ids);
      return products
        .filter((product) => idSet.has(product.id))
        .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    },

    async isWishlisted(customerId, productId) {
      const { wishlist } = await store.read();
      return wishlist.some((entry) => entry.customerId === customerId && entry.productId === productId);
    },

    async toggleWishlist(customerId, productId) {
      return store.write((snapshot) => {
        const index = snapshot.wishlist.findIndex(
          (entry) => entry.customerId === customerId && entry.productId === productId,
        );

        if (index >= 0) {
          snapshot.wishlist.splice(index, 1);
          return false;
        }

        snapshot.wishlist.push({ customerId, productId, createdAt: new Date().toISOString() });
        return true;
      });
    },
  };
}
