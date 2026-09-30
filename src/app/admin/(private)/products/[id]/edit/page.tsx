import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/infra/auth/guards';
import { getAppServices } from '@/infra/db';
import { ProductEditForm } from '@/features/admin/product-edit-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEditProductPage({ params }: Props) {
  await requireAdminPage();
  const { id } = await params;

  const services = await getAppServices();
  const product = await services.repos.products.findById(id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link
          href="/admin/products"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim transition-colors hover:text-ember"
        >
          ← All products
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">
          Edit product
        </h1>
        <p className="numeric mt-2 text-sm text-fg-muted">
          {product.id} ·{' '}
          <Link
            href={`/product/${product.id}`}
            className="underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-ember"
          >
            view storefront page
          </Link>
        </p>
      </header>

      <ProductEditForm product={product} />
    </div>
  );
}
