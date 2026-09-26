import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../domain/order';
import { mobileSchema, pincodeSchema, requiredText } from './common';

export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);

export const orderAddressSchema = z.object({
  houseFlat: requiredText('House / flat is required', 200),
  streetLocality: requiredText('Street or locality is required', 200),
  city: requiredText('City is required', 100),
  state: requiredText('State is required', 100),
  pincode: pincodeSchema,
  instructions: z.string().trim().max(500).optional().default(''),
});

/**
 * A checkout line. **No price field exists here on purpose** — the server
 * reads prices from the catalogue, so a client cannot set them.
 */
export const checkoutLineSchema = z.object({
  productId: z.string().trim().min(1, 'productId is required').max(80),
  quantity: z.number().int().min(1).max(99, 'At most 99 of one item per order'),
  personalizationImage: z.string().trim().max(500).nullish(),
  customizationNotes: z.string().trim().max(1000).nullish(),
});

export const placeOrderSchema = z.object({
  customerName: requiredText('Name is required', 120),
  mobile: mobileSchema,
  address: orderAddressSchema,
  items: z.array(checkoutLineSchema).min(1, 'Your cart is empty').max(200),
  paymentMethod: paymentMethodSchema.default('COD'),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type CheckoutLineInput = z.infer<typeof checkoutLineSchema>;

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});

export const orderQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  customerId: z.string().trim().min(1).optional(),
});

/** Guest order lookup: `KRK-XXXXXX`. */
export const orderIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^KRK-[A-Z0-9]{6}$/, 'Order ids look like KRK-7F3K9Q');
