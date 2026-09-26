import type { OrderAddress } from './order';
import { normalizeIndianMobile } from './order';

/* ── Customer ───────────────────────────────────────────────────────────── */

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string;
  /** Never serialised to a client — see {@link toPublicCustomer}. */
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface PublicCustomer {
  id: string;
  email: string;
  name: string;
  phone: string;
}

export function toPublicCustomer(customer: Customer): PublicCustomer {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
  };
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/* ── Password policy ────────────────────────────────────────────────────── */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Returns human-readable problems; an empty array means the password is fine. */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    issues.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    issues.push(`Use at most ${PASSWORD_MAX_LENGTH} characters.`);
  }
  if (password.length > 0 && !/[a-z]/.test(password)) {
    issues.push('Include at least one lowercase letter.');
  }
  if (password.length > 0 && !/[A-Z]/.test(password)) {
    issues.push('Include at least one uppercase letter.');
  }
  if (password.length > 0 && !/\d/.test(password)) {
    issues.push('Include at least one number.');
  }

  return issues;
}

/* ── Addresses ──────────────────────────────────────────────────────────── */

export interface CustomerAddress {
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
  createdAt: string;
}

export function addressToOrderAddress(address: CustomerAddress): OrderAddress {
  return {
    houseFlat: address.houseFlat,
    streetLocality: address.streetLocality,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    instructions: address.instructions,
  };
}

/** One-liner used in address pickers and order cards. */
export function formatAddress(address: Omit<CustomerAddress, 'id' | 'customerId' | 'createdAt'>): string {
  return [address.houseFlat, address.streetLocality, address.city, address.state, address.pincode]
    .filter((part) => part.trim().length > 0)
    .join(', ');
}

export function defaultAddress(addresses: readonly CustomerAddress[]): CustomerAddress | null {
  return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
}

export const INDIAN_PINCODE_PATTERN = /^[1-9]\d{5}$/;

export function isValidIndianPincode(pincode: string): boolean {
  return INDIAN_PINCODE_PATTERN.test(pincode.trim());
}

export { normalizeIndianMobile };
