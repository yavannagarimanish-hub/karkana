import type { Product } from '../domain/product';

/**
 * Catalogue completeness reporting.
 *
 * v1 kept a separate `deep_validate.mjs` script and a `CatalogueValidationReport`
 * shape full of stringly-typed buckets. This is the same intent, computed from
 * the domain entities, with a single flat issue list and a coverage table the
 * admin UI can render directly.
 */

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INCOMPLETE';

export interface CatalogueIssue {
  productId: string;
  productName: string;
  field: string;
  severity: ValidationSeverity;
  message: string;
}

export interface FieldCoverage {
  field: string;
  label: string;
  filled: number;
  total: number;
  percent: number;
}

export interface CatalogueValidationReport {
  generatedAt: string;
  totalProducts: number;
  issueCount: number;
  bySeverity: Record<ValidationSeverity, number>;
  issues: CatalogueIssue[];
  /** Distinct product ids carrying at least one ERROR or WARNING. */
  productsRequiringAttention: string[];
  /** Share of products with no ERROR and no WARNING, 0..1. */
  completeness: number;
  coverage: FieldCoverage[];
}

const COVERAGE_FIELDS: { field: keyof Product | 'image'; label: string }[] = [
  { field: 'description', label: 'Description' },
  { field: 'shortDescription', label: 'Short description' },
  { field: 'brand', label: 'Brand' },
  { field: 'category', label: 'Category' },
  { field: 'originalPrice', label: 'MRP' },
  { field: 'stockQuantity', label: 'Stock quantity' },
  { field: 'safetyInstructions', label: 'Safety instructions' },
  { field: 'searchKeywords', label: 'Search keywords' },
  { field: 'image', label: 'Product image' },
];

function isFilled(product: Product, field: (typeof COVERAGE_FIELDS)[number]['field']): boolean {
  if (field === 'image') return product.images.some((image) => image.length > 0);
  const value = product[field];
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return Boolean(value);
}

export function validateCatalogue(
  products: readonly Product[],
  options: { now?: Date } = {},
): CatalogueValidationReport {
  const issues: CatalogueIssue[] = [];
  const seen = new Map<string, number>();

  for (const product of products) {
    const name = product.name || '(unnamed)';
    const push = (field: string, severity: ValidationSeverity, message: string) =>
      issues.push({ productId: product.id, productName: name, field, severity, message });

    seen.set(product.id, (seen.get(product.id) ?? 0) + 1);

    /* ── Blocking ─────────────────────────────────────────────────────── */
    if (!product.name.trim()) push('name', 'ERROR', 'Product has no name.');
    if (!(product.price > 0)) push('price', 'ERROR', `Selling price is ${product.price}; it must be above 0.`);
    if (
      product.originalPrice !== null &&
      product.originalPrice > 0 &&
      product.originalPrice < product.price
    ) {
      push(
        'originalPrice',
        'ERROR',
        `MRP ${product.originalPrice} is lower than the selling price ${product.price}.`,
      );
    }
    if (!product.images.some((image) => image.length > 0)) {
      push('images', 'ERROR', 'No product image is assigned.');
    }

    /* ── Should fix ───────────────────────────────────────────────────── */
    if (!product.description.trim()) push('description', 'WARNING', 'Description is empty.');
    if (product.stockQuantity === null) {
      push('stockQuantity', 'WARNING', 'Stock quantity is unknown; availability is being assumed.');
    }
    if (!product.category.trim()) push('category', 'WARNING', 'Category is empty.');
    if (!product.brand.trim()) push('brand', 'WARNING', 'Brand is empty.');
    if (product.originalPrice === null) {
      push('originalPrice', 'WARNING', 'No MRP recorded, so no discount can be shown.');
    }

    /* ── Nice to have ─────────────────────────────────────────────────── */
    if (!product.shortDescription.trim()) {
      push('shortDescription', 'INCOMPLETE', 'Short description is empty.');
    }
    if (!product.safetyInstructions.trim()) {
      push('safetyInstructions', 'INCOMPLETE', 'Safety instructions are empty.');
    }
    if (!product.searchKeywords.trim()) {
      push('searchKeywords', 'INCOMPLETE', 'Search keywords are empty.');
    }
  }

  for (const [id, count] of seen) {
    if (count > 1) {
      issues.push({
        productId: id,
        productName: id,
        field: 'id',
        severity: 'ERROR',
        message: `Product id ${id} appears ${count} times.`,
      });
    }
  }

  const bySeverity: Record<ValidationSeverity, number> = { ERROR: 0, WARNING: 0, INCOMPLETE: 0 };
  for (const issue of issues) bySeverity[issue.severity] += 1;

  const needingAttention = new Set(
    issues.filter((issue) => issue.severity !== 'INCOMPLETE').map((issue) => issue.productId),
  );

  const coverage: FieldCoverage[] = COVERAGE_FIELDS.map(({ field, label }) => {
    const filled = products.filter((product) => isFilled(product, field)).length;
    return {
      field: String(field),
      label,
      filled,
      total: products.length,
      percent: products.length === 0 ? 0 : Math.round((filled / products.length) * 100),
    };
  });

  const severityRank: Record<ValidationSeverity, number> = { ERROR: 0, WARNING: 1, INCOMPLETE: 2 };
  issues.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      a.productId.localeCompare(b.productId) ||
      a.field.localeCompare(b.field),
  );

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    totalProducts: products.length,
    issueCount: issues.length,
    bySeverity,
    issues,
    productsRequiringAttention: [...needingAttention].sort(),
    completeness:
      products.length === 0 ? 0 : (products.length - needingAttention.size) / products.length,
    coverage,
  };
}
