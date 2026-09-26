import { z } from 'zod';
import { normalizeIndianMobile } from '../domain/order';

/* ── Shared primitives ──────────────────────────────────────────────────── */

/** Non-negative rupee amount. Converted to integer paise inside pricing. */
export const rupeesSchema = z
  .number()
  .finite()
  .min(0, 'Price cannot be negative')
  .max(99_99_999, 'Price is implausibly large');

export const optionalText = (max = 4000) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim());

export const requiredText = (message: string, max = 4000) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, `Must be ${max} characters or fewer`);

/** 10-digit Indian mobile, tolerant of `+91`, `0` prefixes and spacing. */
export const mobileSchema = z
  .string()
  .transform((value) => normalizeIndianMobile(value))
  .pipe(z.string({ error: 'Enter a valid 10-digit Indian mobile number' }).length(10));

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');

export const idParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(80);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(96).default(24),
});

/** Turns a ZodError into the shape every `/api/v1` error response uses. */
export function fieldIssues(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
