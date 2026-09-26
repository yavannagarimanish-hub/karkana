import { getAppServices } from '@/infra/db';
import { readAdminSession, requireAdmin } from '@/infra/auth/guards';
import { createProductSchema, productQuerySchema } from '@/core/schemas/product';
import { ok, toErrorResponse } from '@/infra/http';
import { filterProducts, paginate } from '@/core/domain/catalogue';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = productQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const services = await getAppServices();
    const admin = await readAdminSession();

    // `all=true` (hidden products) is honoured only for an admin session.
    const includeHidden = Boolean(admin && query.all);

    const products = await services.repos.products.list({
      module: query.module ?? null,
      category: query.category ?? null,
      includeHidden,
      featured: query.featured,
      popular: query.popular,
    });

    const filtered = filterProducts(products, {
      module: query.module ?? null,
      category: query.category ?? null,
      search: query.search ?? null,
      sort: query.sort,
      inStockOnly: query.inStockOnly,
      minPricePaise: query.minPrice ?? null,
      maxPricePaise: query.maxPrice ?? null,
    });

    return ok({ page: paginate(filtered, query.page ?? 1, query.pageSize ?? 24) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = createProductSchema.parse(await request.json());

    const services = await getAppServices();
    const product = await services.admin.createProduct(input);

    return ok({ product }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
