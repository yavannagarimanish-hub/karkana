import { getAppServices } from '@/infra/db';
import { readAdminSession, readCustomerSession } from '@/infra/auth/guards';
import { ok } from '@/infra/http';

/** Reports both session kinds so the client shell can render account state. */
export async function GET() {
  const [admin, customer] = await Promise.all([readAdminSession(), readCustomerSession()]);

  if (!customer) {
    return ok({ admin: admin ? { username: admin.sub } : null, customer: null });
  }

  const services = await getAppServices();
  const profile = await services.accounts.profile(customer.sub).catch(() => null);

  return ok({ admin: admin ? { username: admin.sub } : null, customer: profile });
}
