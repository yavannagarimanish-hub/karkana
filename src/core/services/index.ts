import type { Repositories } from '../ports';
import type { PricingPolicy } from '../domain/pricing';
import { DEFAULT_PRICING_POLICY } from '../domain/pricing';
import { createAccountsService } from './accounts';
import { createAdminService } from './admin';
import { createCatalogueService } from './catalogue';
import { createCheckoutService } from './checkout';
import { createOrdersService } from './orders';

export interface Services {
  catalogue: ReturnType<typeof createCatalogueService>;
  checkout: ReturnType<typeof createCheckoutService>;
  orders: ReturnType<typeof createOrdersService>;
  accounts: ReturnType<typeof createAccountsService>;
  admin: ReturnType<typeof createAdminService>;
  repos: Repositories;
}

/** One composition root: build every service against the same repositories. */
export function createServices(
  repos: Repositories,
  policy: PricingPolicy = DEFAULT_PRICING_POLICY,
): Services {
  return {
    catalogue: createCatalogueService(repos),
    checkout: createCheckoutService(repos, policy),
    orders: createOrdersService(repos),
    accounts: createAccountsService(repos),
    admin: createAdminService(repos, policy),
    repos,
  };
}

export * from './accounts';
export * from './admin';
export * from './catalogue';
export * from './checkout';
export * from './orders';
export * from './validation';
