import { getAppServices } from '@/infra/db';
import { optionalCustomer, readAdminSession } from '@/infra/auth/guards';
import { placeOrderSchema } from '@/core/schemas/order';
import { fail, ok, toErrorResponse } from '@/infra/http';

/**
 * GET  — admins see every order; signed-in customers see their own.
 * POST — places an order. Prices are recomputed server-side from the
 *        catalogue; the request body carries ids and quantities only.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const services = await getAppServices();
    const admin = await readAdminSession();

    if (admin) {
      const status = searchParams.get('status');
      return ok({ orders: await services.orders.list({ status: status as never }) });
    }

    const customer = await optionalCustomer();
    if (!customer) return fail('Sign in to list your orders.', 401, 'UNAUTHORIZED');

    return ok({ orders: await services.orders.listForCustomer(customer.sub) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = placeOrderSchema.parse(await request.json());
    const customer = await optionalCustomer();
    const services = await getAppServices();

    const order = await services.checkout.placeOrder(input, { customerId: customer?.sub ?? null });
    return ok({ order }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
