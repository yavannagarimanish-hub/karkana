import Image from 'next/image';
import Link from 'next/link';
import { requireAdminPage } from '@/infra/auth/guards';
import { getAppServices } from '@/infra/db';
import { primaryImage } from '@/core/domain/product';
import { Table, TD, TDNumber, TH, THead, TR } from '@/ui/table';
import { ProductForm } from '@/features/admin/product-form';
import { ProductPrice, ProductRowActions, ProductStatusBadges } from '@/features/admin/product-table';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminProductsPage({ searchParams }: Props) {
  await requireAdminPage();
  const services = await getAppServices();

  const sp = await searchParams;
  const query = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';
  const moduleFilter = typeof sp.module === 'string' ? sp.module.toUpperCase() : '';

  const all = await services.admin.listProducts();
  const products = all
    .filter((product) => (moduleFilter ? product.module === moduleFilter : true))
    .filter((product) =>
      query
        ? `${product.id} ${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query)
        : true,
    );

  const nextId = await services.repos.products.nextId();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">Products</h1>
          <p className="numeric mt-2 text-sm text-fg-muted">
            {products.length} of {all.length} shown
          </p>
        </div>

        <form className="flex flex-wrap items-center gap-2" action="/admin/products">
          <label htmlFor="q" className="label">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="id, name, brand"
            className="h-9 w-48 rounded-sm bg-panel px-3 text-sm text-fg placeholder:text-fg-ghost shadow-hairline-strong focus:outline-none"
          />
          <label htmlFor="module" className="label">
            Module
          </label>
          <select
            id="module"
            name="module"
            defaultValue={moduleFilter}
            className="h-9 rounded-sm bg-panel px-3 text-sm text-fg shadow-hairline-strong focus:outline-none"
          >
            <option value="">All</option>
            <option value="BASIC">Basic</option>
            <option value="CUSTOMIZED">Customized</option>
            <option value="PERSONALIZED">Personalized</option>
          </select>
          <button
            type="submit"
            className="h-9 rounded-sm px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-fg shadow-hairline-strong transition-colors hover:text-ember"
          >
            Filter
          </button>
        </form>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="surface overflow-hidden rounded-sm">
            <Table>
              <THead>
                <TR>
                  <TH>Product</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Price</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <tbody>
                {products.map((product) => {
                  const image = primaryImage(product);

                  return (
                    <TR key={product.id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-sm bg-void p-1 shadow-hairline">
                            {image ? (
                              <Image
                                src={image}
                                alt=""
                                width={96}
                                height={96}
                                className="max-h-full w-auto max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[9px] text-fg-ghost">No image</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/product/${product.id}`}
                              className="block truncate text-sm font-semibold tracking-[0.04em] uppercase transition-colors hover:text-ember"
                            >
                              {product.name}
                            </Link>
                            <p className="numeric text-[11px] text-fg-dim">
                              {product.id} · {product.category || 'no category'}
                            </p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <ProductStatusBadges product={product} />
                      </TD>
                      <TDNumber>
                        <ProductPrice product={product} />
                      </TDNumber>
                      <TD>
                        <ProductRowActions product={product} />
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </div>

        <div className="lg:col-span-4">
          <ProductForm nextId={nextId} />
        </div>
      </div>
    </div>
  );
}
