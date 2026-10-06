import type { ProductFamily } from '@/core/domain/catalog-families';
import { FamilyCard } from './family-card';
import { cn } from './cn';

export interface FamilyGridProps {
  families: readonly ProductFamily[];
  priorityCount?: number;
  className?: string;
}

/**
 * Responsive grid for customer-facing product families.
 * Always renders 3 cards per row on mobile viewports without horizontal overflow.
 */
export function FamilyGrid({ families, priorityCount = 3, className }: FamilyGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5',
        className,
      )}
    >
      {families.map((family, index) => (
        <FamilyCard
          key={family.id}
          family={family}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}

