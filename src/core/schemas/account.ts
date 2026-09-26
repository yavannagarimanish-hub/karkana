import { z } from 'zod';
import { normalizeEmail, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../domain/account';
import { mobileSchema, pincodeSchema, requiredText } from './common';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .transform((value) => normalizeEmail(value))
  .pipe(z.email('Enter a valid email address').max(254));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`)
  .refine((value) => /[a-z]/.test(value), 'Include at least one lowercase letter')
  .refine((value) => /[A-Z]/.test(value), 'Include at least one uppercase letter')
  .refine((value) => /\d/.test(value), 'Include at least one number');

export const registerCustomerSchema = z.object({
  name: requiredText('Name is required', 120),
  email: emailSchema,
  phone: mobileSchema,
  password: passwordSchema,
});

/** Login accepts any password shape — wrong credentials must not leak the policy. */
export const loginSchema = z.object({
  email: z.string().trim().transform((value) => normalizeEmail(value)),
  password: z.string().min(1, 'Password is required').max(PASSWORD_MAX_LENGTH),
});

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(254),
  password: z.string().min(1, 'Password is required').max(PASSWORD_MAX_LENGTH),
});

export const createAddressSchema = z.object({
  label: z.string().trim().max(40).optional().default('Home'),
  houseFlat: requiredText('House / flat is required', 200),
  streetLocality: requiredText('Street or locality is required', 200),
  city: requiredText('City is required', 100),
  state: requiredText('State is required', 100),
  pincode: pincodeSchema,
  instructions: z.string().trim().max(500).optional().default(''),
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = createAddressSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Nothing to update' },
);

export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const wishlistToggleSchema = z.object({
  productId: z.string().trim().min(1).max(80),
});
