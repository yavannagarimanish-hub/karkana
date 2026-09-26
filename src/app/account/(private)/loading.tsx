/*
 * A `loading.tsx` boundary flushes its fallback and commits HTTP 200 before the
 * page renders. Any route that calls `notFound()` based on data therefore
 * becomes a soft 404 (200 with the not-found UI), so `/module/[module]` and
 * `/product/[id]` deliberately have no loading boundary. This one is safe
 * because the account layout redirects rather than 404s.
 */
import { DashboardSkeleton } from '@/ui/page-skeleton';

export default function Loading() {
  return <DashboardSkeleton />;
}
