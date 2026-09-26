import { getAppServices } from '@/infra/db';
import { requireAdmin } from '@/infra/auth/guards';
import { reorderProductsSchema } from '@/core/schemas/product';
import { ok, toErrorResponse } from '@/infra/http';

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { ids } = reorderProductsSchema.parse(await request.json());

    const services = await getAppServices();
    await services.admin.reorderProducts(ids);

    return ok({ reordered: ids.length });
  } catch (error) {
    return toErrorResponse(error);
  }
}
