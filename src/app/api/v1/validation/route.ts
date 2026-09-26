import { getAppServices } from '@/infra/db';
import { requireAdmin } from '@/infra/auth/guards';
import { ok, toErrorResponse } from '@/infra/http';

export async function GET() {
  try {
    await requireAdmin();
    const services = await getAppServices();
    return ok({ report: await services.admin.validation() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
