import { getAppServices } from '@/infra/db';
import { requireCustomer } from '@/infra/auth/guards';
import { updateAddressSchema } from '@/core/schemas/account';
import { fail, ok, toErrorResponse } from '@/infra/http';

interface Context {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const patch = updateAddressSchema.parse(await request.json());

    const services = await getAppServices();
    const address = await services.accounts.updateAddress(session.sub, id, patch);
    if (!address) return fail('Address not found.', 404, 'NOT_FOUND');

    return ok({ address });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;

    const services = await getAppServices();
    const removed = await services.accounts.removeAddress(session.sub, id);
    if (!removed) return fail('Address not found.', 404, 'NOT_FOUND');

    return ok({ removed: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
