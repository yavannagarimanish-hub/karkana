import { toPublicCustomer, type Customer, type CustomerAddress, type PublicCustomer } from '../domain/account';
import type { Product } from '../domain/product';
import type { CreateAddressInput, RegisterCustomerInput } from '../schemas/account';
import type { Repositories } from '../ports';

export type AccountErrorCode = 'EMAIL_TAKEN' | 'INVALID_CREDENTIALS';

export class AccountError extends Error {
  constructor(
    readonly code: AccountErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AccountError';
  }
}

export function createAccountsService(repos: Repositories) {
  async function register(input: RegisterCustomerInput): Promise<PublicCustomer> {
    const existing = await repos.customers.findByEmail(input.email);
    if (existing) {
      throw new AccountError('EMAIL_TAKEN', 'An account already uses that email address.');
    }

    const now = repos.clock.now();
    const passwordHash = await repos.passwords.hash(input.password);

    const customer = await repos.customers.create({
      id: repos.ids.customer(),
      email: input.email,
      name: input.name,
      phone: input.phone,
      passwordHash,
      now,
    });

    return toPublicCustomer(customer);
  }

  /**
   * Deliberately returns the same generic error for an unknown email and a
   * wrong password, so the endpoint cannot be used to enumerate accounts.
   */
  async function login(email: string, password: string): Promise<PublicCustomer> {
    const customer = await repos.customers.findByEmail(email);
    const ok = customer ? await repos.passwords.verify(password, customer.passwordHash) : false;

    if (!customer || !ok) {
      throw new AccountError('INVALID_CREDENTIALS', 'That email and password do not match our records.');
    }

    await repos.customers.recordLogin(customer.id, repos.clock.now());
    return toPublicCustomer(customer);
  }

  async function profile(customerId: string): Promise<PublicCustomer> {
    const customer = await repos.customers.findById(customerId);
    if (!customer) throw new AccountError('INVALID_CREDENTIALS', 'Account not found.');
    return toPublicCustomer(customer);
  }

  async function changePassword(customerId: string, currentPassword: string, nextPassword: string) {
    const customer = await repos.customers.findById(customerId);
    if (!customer) throw new AccountError('INVALID_CREDENTIALS', 'Account not found.');

    const ok = await repos.passwords.verify(currentPassword, customer.passwordHash);
    if (!ok) throw new AccountError('INVALID_CREDENTIALS', 'Your current password is incorrect.');

    await repos.customers.updatePassword(customerId, await repos.passwords.hash(nextPassword), repos.clock.now());
  }

  /* ── Addresses ────────────────────────────────────────────────────────── */

  async function listAddresses(customerId: string): Promise<CustomerAddress[]> {
    return repos.customers.listAddresses(customerId);
  }

  async function addAddress(customerId: string, input: CreateAddressInput): Promise<CustomerAddress> {
    return repos.customers.createAddress({
      id: repos.ids.address(),
      customerId,
      label: input.label,
      houseFlat: input.houseFlat,
      streetLocality: input.streetLocality,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      instructions: input.instructions,
      isDefault: input.isDefault,
      now: repos.clock.now(),
    });
  }

  async function updateAddress(
    customerId: string,
    addressId: string,
    patch: Partial<CreateAddressInput>,
  ): Promise<CustomerAddress | null> {
    return repos.customers.updateAddress(customerId, addressId, patch);
  }

  async function removeAddress(customerId: string, addressId: string): Promise<boolean> {
    return repos.customers.removeAddress(customerId, addressId);
  }

  /* ── Wishlist ─────────────────────────────────────────────────────────── */

  async function wishlist(customerId: string): Promise<Product[]> {
    return repos.customers.wishlist(customerId);
  }

  async function isWishlisted(customerId: string, productId: string): Promise<boolean> {
    return repos.customers.isWishlisted(customerId, productId);
  }

  async function toggleWishlist(customerId: string, productId: string): Promise<boolean> {
    return repos.customers.toggleWishlist(customerId, productId);
  }

  return {
    register,
    login,
    profile,
    changePassword,
    listAddresses,
    addAddress,
    updateAddress,
    removeAddress,
    wishlist,
    isWishlisted,
    toggleWishlist,
    toPublicCustomer,
  };
}

export type AccountsService = ReturnType<typeof createAccountsService>;
export type { Customer, PublicCustomer };
