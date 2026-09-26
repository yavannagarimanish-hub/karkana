import { getAppServices } from '@/infra/db';
import { requireCustomerPage } from '@/infra/auth/guards';
import { EmptyState } from '@/ui/empty-state';
import { ProductGrid } from '@/ui/product-grid';

export default async function WishlistPage() {
  const session = await requireCustomerPage();
  const services = await getAppServices();
  const products = await services.accounts.wishlist(session.sub);

  if (products.length === 0) {
    return (
      <EmptyState
        title="Your wishlist is empty"
        message="Tap the heart on any product to keep it here for later."
        actionLabel="Browse the catalogue"
        actionHref="/"
      />
    );
  }

  return <ProductGrid products={products} priorityCount={0} />;
}
