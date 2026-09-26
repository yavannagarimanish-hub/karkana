import { getAppServices } from '@/infra/db';
import { requireCustomer } from '@/infra/auth/guards';
import { createAddressSchema } from '@/core/schemas/account';
import { ok, toErrorResponse } from '@/infra/http';

export async function GET() {
  try {
    const session = await requireCustomer();
    const services = await getAppServices();
    return ok({ addresses: await services.accounts.listAddresses(session.sub) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    const input = createAddressSchema.parse(await request.json());
    const services = await getAppServices();
    const address = await services.accounts.addAddress(session.sub, input);
    return ok({ address }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
