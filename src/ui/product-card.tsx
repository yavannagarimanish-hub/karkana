import Image from 'next/image';
import Link from 'next/link';
import { MODULE_SLUGS, primaryImage } from '@/core/domain/product';
import { formatINR } from '@/core/domain/money';
import { discountPercent } from '@/core/domain/money';
import { pricePaise, mrpPaise } from '@/core/domain/product';
import type { Product } from '@/core/domain/product';
import { Badge } from './badge';
import { cn } from './cn';

export interface ProductCardProps {
  product: Product;
  /** Rendered in the top-right corner, e.g. a wishlist toggle. */
  action?: React.ReactNode;
  priority?: boolean;
  className?: string;
}

/**
 * Product card. The image well is square and `object-contain`, so tall, wide
 * and square packaging are all shown whole — never cropped, never stretched.
 */
export function ProductCard({ product, action, priority, className }: ProductCardProps) {
  const image = primaryImage(product);
  const price = pricePaise(product);
  const mrp = mrpPaise(product);
  const off = mrp ? discountPercent(mrp, price) : 0;
  const width = product.imageWidth ?? 1200;
  const height = product.imageHeight ?? 1200;

  return (
    <Link
      href={`/product/${product.id}`}
      className={cn(
        'group surface flex flex-col overflow-hidden rounded-sm transition-[box-shadow,transform] duration-200 ease-[cubic-bezier(.16,1,.3,1)]',
        'hover:shadow-hairline-strong focus-visible:shadow-[inset_0_0_0_1px_var(--color-ember)]',
        className,
      )}
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden border-b border-hairline bg-void p-4 sm:p-8">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            width={width}
            height={height}
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="max-h-full w-auto max-w-full object-contain transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]"
          />
        ) : (
          <span className="label">No image</span>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge tone={product.module === 'PERSONALIZED' ? 'ember' : 'neutral'}>
            {MODULE_SLUGS[product.module]}
          </Badge>
          {off > 0 && <Badge tone="ember">−{off}%</Badge>}
        </div>

        {action && <div className="absolute top-2 right-2">{action}</div>}

        {!product.inStock && (
          <div className="absolute inset-0 grid place-items-center bg-void/80">
            <span className="rounded-xs border border-status-danger px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-status-danger">
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category && <span className="label truncate">{product.category}</span>}

        <h3 className="line-clamp-2 text-[13px] leading-snug font-semibold tracking-[0.04em] text-fg uppercase transition-colors group-hover:text-ember">
          {product.name}
        </h3>

        <div className="numeric mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-sm font-bold text-fg">{formatINR(price)}</span>
          {mrp && <span className="text-[11px] text-fg-ghost line-through">{formatINR(mrp)}</span>}
        </div>
      </div>
    </Link>
  );
}
