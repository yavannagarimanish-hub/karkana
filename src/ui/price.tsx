import { formatINR } from '@/core/domain/money';
import { cn } from './cn';

type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl sm:text-3xl',
};

export interface PriceProps {
  /** Integer paise. */
  value: number;
  /** Strike-through MRP, also in paise. */
  compareAt?: number | null;
  size?: Size;
  /** Shows the `-39%` delta in ember. */
  showDiscount?: boolean;
  className?: string;
}

/**
 * Prices are rendered from paise through a single formatter, always with
 * tabular numerals so columns line up.
 */
export function Price({ value, compareAt, size = 'md', showDiscount, className }: PriceProps) {
  const discount =
    compareAt && compareAt > value ? Math.round(((compareAt - value) / compareAt) * 100) : null;

  return (
    <span className={cn('numeric inline-flex flex-wrap items-baseline gap-2', className)}>
      <span className={cn('font-bold text-fg', SIZE[size])}>{formatINR(value)}</span>

      {compareAt && compareAt > value && (
        <span className="text-xs text-fg-ghost line-through">{formatINR(compareAt)}</span>
      )}

      {showDiscount && discount !== null && discount > 0 && (
        <span className="font-mono text-[11px] font-bold tracking-[0.1em] text-ember">
          −{discount}%
        </span>
      )}
    </span>
  );
}
