import { z } from 'zod';
import { ORIENTATIONS, PRODUCT_MODULES } from '../domain/product';
import { SORT_KEYS } from '../domain/catalogue';
import { rupeesSchema } from './common';

const imageUrlSchema = z.string().trim().max(500);

export const productModuleSchema = z.enum(PRODUCT_MODULES);
export const orientationSchema = z.enum(ORIENTATIONS);

/** Admin create-product payload. */
export const createProductSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[A-Z]{2,6}\d{2,6}$/, 'Use the catalogue format, e.g. KRK139')
    .optional(),
  name: z.string().trim().min(1, 'Name is required').max(255),
  brand: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  subcategory: z.string().trim().max(100).optional(),
  description: z.string().trim().max(8000).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  price: rupeesSchema,
  originalPrice: rupeesSchema.nullable().optional(),
  stockQuantity: z.number().int().min(0).nullable().optional(),
  unit: z.string().trim().max(50).optional(),
  images: z.array(imageUrlSchema).max(10).optional(),
  video: z.string().trim().max(500).optional(),
  module: productModuleSchema,
  displayPosition: z.number().int().min(0).max(99999).optional(),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  inStock: z.boolean().optional(),
  searchKeywords: z.string().trim().max(1000).optional(),
  safetyInstructions: z.string().trim().max(4000).optional(),
  notes: z.string().trim().max(4000).optional(),
  imageWidth: z.number().int().positive().nullable().optional(),
  imageHeight: z.number().int().positive().nullable().optional(),
  orientation: orientationSchema.nullable().optional(),
});

/** Admin update payload: every field optional, but at least one must be set. */
export const updateProductSchema = createProductSchema
  .partial()
  .omit({ id: true })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** `GET /api/v1/products` query string. */
export const productQuerySchema = z.object({
  module: productModuleSchema.optional(),
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(SORT_KEYS).optional(),
  inStockOnly: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  /** `all=true` is admin-only; the storefront always sees visible products. */
  all: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  popular: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(96).optional(),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

export const reorderProductsSchema = z.object({
  /** Product ids in their new order. */
  ids: z.array(z.string().trim().min(1)).min(1, 'Provide at least one product'),
});
