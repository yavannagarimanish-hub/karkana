import type { Metadata } from 'next';
import { requireAdminPage } from '@/infra/auth/guards';
import { getAppServices } from '@/infra/db';
import { ProductReorder } from '@/features/admin/product-reorder';

export const metadata: Metadata = {
  title: 'Reorder Products | Karkana Operator',
  robots: { index: false, follow: false },
};

export default async function AdminProductReorderPage() {
  await requireAdminPage();
  const services = await getAppServices();

  const products = await services.admin.listProducts();

  return <ProductReorder initialProducts={products} />;
}
