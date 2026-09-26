import { getAppServices } from '@/infra/db';
import { AccountError } from '@/core/services/accounts';
import { registerCustomerSchema } from '@/core/schemas/account';
import {
  CUSTOMER_SESSION_TTL_MS,
  SESSION_COOKIES,
  createCustomerToken,
  sessionCookieOptions,
} from '@/infra/auth/session';
import { fail, ok, toErrorResponse } from '@/infra/http';
import { AUTH_LIMITS, checkRateLimit, clientKey } from '@/infra/auth/rate-limit';

export async function POST(request: Request) {
  try {
    // Stops bulk account creation and slows credential harvesting.
    const limited = checkRateLimit(clientKey(request, 'register'), AUTH_LIMITS.register);
    if (!limited.allowed) {
      return fail(
        `Too many accounts created from this connection. Try again in ${limited.retryAfterSeconds} seconds.`,
        429,
        'RATE_LIMITED',
        undefined,
        { 'Retry-After': String(limited.retryAfterSeconds) },
      );
    }

    const input = registerCustomerSchema.parse(await request.json());
    const services = await getAppServices();
    const customer = await services.accounts.register(input);

    const response = ok({ customer });
    response.cookies.set({
      name: SESSION_COOKIES.customer,
      value: createCustomerToken(customer.id, customer.email),
      ...sessionCookieOptions(CUSTOMER_SESSION_TTL_MS / 1000),
    });
    return response;
  } catch (error) {
    if (error instanceof AccountError && error.code === 'EMAIL_TAKEN') {
      return fail(error.message, 409, error.code);
    }
    return toErrorResponse(error);
  }
}
