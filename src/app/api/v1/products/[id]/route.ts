import { getAppServices } from '@/infra/db';
import { requireAdmin } from '@/infra/auth/guards';
import { updateProductSchema } from '@/core/schemas/product';
import { fail, ok, toErrorResponse } from '@/infra/http';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const services = await getAppServices();

    const product = await services.repos.products.findById(id);
    if (!product) return fail('Product not found.', 404, 'NOT_FOUND');

    return ok({ product });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const patch = updateProductSchema.parse(await request.json());

    const services = await getAppServices();
    const product = await services.admin.updateProduct(id, patch);

    return ok({ product });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const services = await getAppServices();
    await services.admin.deleteProduct(id);

    return ok({ deleted: id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
