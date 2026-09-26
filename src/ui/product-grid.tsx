import type { Product } from '@/core/domain/product';
import { ProductCard } from './product-card';
import { cn } from './cn';

export interface ProductGridProps {
  products: readonly Product[];
  /** How many leading cards get `priority` (above-the-fold) loading. */
  priorityCount?: number;
  /** Optional per-card overlay, e.g. a wishlist toggle. */
  renderAction?: (product: Product) => React.ReactNode;
  className?: string;
}

/**
 * Responsive grid. v1 used CSS `columns`, which reorders visually but not in
 * the DOM — keyboard and screen-reader users got a different sequence than
 * sighted users. A real grid keeps them identical.
 */
export function ProductGrid({
  products,
  priorityCount = 4,
  renderAction,
  className,
}: ProductGridProps) {
  return (
    <div
      className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5', className)}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
          action={renderAction ? renderAction(product) : undefined}
        />
      ))}
    </div>
  );
}
