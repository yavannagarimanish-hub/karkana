import { getAppServices } from '@/infra/db';
import { requireAdmin } from '@/infra/auth/guards';
import { ok, toErrorResponse } from '@/infra/http';

export async function GET() {
  try {
    await requireAdmin();
    const services = await getAppServices();
    return ok({ dashboard: await services.admin.dashboard() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
