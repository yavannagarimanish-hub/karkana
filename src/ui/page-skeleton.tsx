import { ProductGridSkeleton, Skeleton } from './skeleton';

/**
 * Shared skeletons for route-level `loading.tsx` boundaries.
 *
 * Each one mirrors the real page's outer container and heading height so the
 * transition to rendered content does not shift the layout. `role="status"`
 * plus a visually hidden label keeps the pending state announced rather than
 * silent for screen-reader users.
 */
function Pending({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Home and catalogue listings: heading block, then a product grid. */
export function CatalogueSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Pending label="Loading the catalogue">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-12">
        <div className="mb-8 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64 max-w-full" />
        </div>
        <ProductGridSkeleton count={count} />
      </div>
    </Pending>
  );
}

/** Product detail: media on the left, buy panel on the right. */
export function ProductSkeleton() {
  return (
    <Pending label="Loading the product">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </Pending>
  );
}

/** Account and admin dashboards: heading, then stacked panels. */
export function DashboardSkeleton() {
  return (
    <Pending label="Loading your account">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-12">
        <div className="mb-8 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-48 max-w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </Pending>
  );
}
