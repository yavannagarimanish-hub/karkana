import { catalogueCounts, type CatalogueCounts } from '../domain/catalogue';
import type { Product } from '../domain/product';
import type { CreateProductInput, UpdateProductInput } from '../schemas/product';
import type { CatalogueSection } from '../domain/catalogue';
import type { Order, OrderStatus } from '../domain/order';
import type { OrderListFilter, OrderMetrics, SectionPatch, Repositories } from '../ports';
import type { PricingPolicy } from '../domain/pricing';
import { DEFAULT_PRICING_POLICY } from '../domain/pricing';
import { validateCatalogue, type CatalogueValidationReport } from './validation';

export type AdminErrorCode = 'NOT_FOUND' | 'DUPLICATE_ID';

export class AdminError extends Error {
  constructor(
    readonly code: AdminErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

export interface DashboardView {
  driver: string;
  products: CatalogueCounts;
  visibleProducts: number;
  hiddenProducts: number;
  outOfStock: number;
  orders: OrderMetrics;
  sections: CatalogueSection[];
  validation: CatalogueValidationReport;
  policy: PricingPolicy;
}

export function createAdminService(repos: Repositories, policy: PricingPolicy = DEFAULT_PRICING_POLICY) {
  /** Admin catalogue: includes hidden products. */
  async function listProducts(): Promise<Product[]> {
    return repos.products.list({ includeHidden: true });
  }

  async function createProduct(input: CreateProductInput): Promise<Product> {
    const id = input.id ?? (await repos.products.nextId());

    if (await repos.products.findById(id)) {
      throw new AdminError('DUPLICATE_ID', `Product ${id} already exists.`);
    }

    return repos.products.create({ ...input, id });
  }

  async function updateProduct(id: string, patch: UpdateProductInput): Promise<Product> {
    const updated = await repos.products.update(id, patch);
    if (!updated) throw new AdminError('NOT_FOUND', `No product ${id} exists.`);
    return updated;
  }

  async function deleteProduct(id: string): Promise<void> {
    const removed = await repos.products.remove(id);
    if (!removed) throw new AdminError('NOT_FOUND', `No product ${id} exists.`);
  }

  async function reorderProducts(ids: readonly string[]): Promise<void> {
    return repos.products.reorder(ids);
  }

  async function listSections(): Promise<CatalogueSection[]> {
    return repos.sections.list();
  }

  async function updateSection(id: string, patch: SectionPatch): Promise<CatalogueSection> {
    const updated = await repos.sections.update(id, patch);
    if (!updated) throw new AdminError('NOT_FOUND', `No section ${id} exists.`);
    return updated;
  }

  async function listOrders(filter: OrderListFilter = {}): Promise<Order[]> {
    return repos.orders.list(filter);
  }

  async function getOrder(id: string): Promise<Order> {
    const order = await repos.orders.findById(id);
    if (!order) throw new AdminError('NOT_FOUND', `No order ${id} exists.`);
    return order;
  }

  async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    // Transition rules live in the orders service; this is a thin admin alias.
    const order = await getOrder(id);
    const updated = await repos.orders.updateStatus(id, status, repos.clock.now());
    if (!updated) throw new AdminError('NOT_FOUND', `No order ${id} exists.`);
    if (order.status === status) return order;
    return updated;
  }

  async function validation(): Promise<CatalogueValidationReport> {
    const products = await repos.products.list({ includeHidden: true });
    return validateCatalogue(products, { now: repos.clock.now() });
  }

  async function dashboard(): Promise<DashboardView> {
    const [products, sections, orders, report] = await Promise.all([
      repos.products.list({ includeHidden: true }),
      repos.sections.list(),
      repos.orders.metrics(),
      validation(),
    ]);

    return {
      driver: repos.driver,
      products: catalogueCounts(products),
      visibleProducts: products.filter((product) => product.isVisible).length,
      hiddenProducts: products.filter((product) => !product.isVisible).length,
      outOfStock: products.filter((product) => !product.inStock).length,
      orders,
      sections,
      validation: report,
      policy,
    };
  }

  return {
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    reorderProducts,
    listSections,
    updateSection,
    listOrders,
    getOrder,
    updateOrderStatus,
    validation,
    dashboard,
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
