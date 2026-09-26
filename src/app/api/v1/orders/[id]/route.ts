import { getAppServices } from '@/infra/db';
import { optionalCustomer, readAdminSession, requireAdmin } from '@/infra/auth/guards';
import { updateOrderStatusSchema } from '@/core/schemas/order';
import { ok, toErrorResponse } from '@/infra/http';
import type { OrderViewer } from '@/core/services/orders';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const services = await getAppServices();

    const admin = await readAdminSession();
    const customer = await optionalCustomer();

    const viewer: OrderViewer = admin
      ? { role: 'admin' }
      : customer
        ? { role: 'customer', customerId: customer.sub }
        : { role: 'guest' };

    const order = await services.orders.getForViewer(id, viewer);
    return ok({ order, timeline: services.orders.timeline(order) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Status changes are admin-only and must follow the state machine. */
export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin();

    const { id } = await context.params;
    const { status } = updateOrderStatusSchema.parse(await request.json());

    const services = await getAppServices();
    const order = await services.orders.setStatus(id, status);

    return ok({ order, timeline: services.orders.timeline(order) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
