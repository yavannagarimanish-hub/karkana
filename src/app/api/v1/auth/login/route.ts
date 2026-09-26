import { getAppServices } from '@/infra/db';
import { loginSchema } from '@/core/schemas/account';
import {
  CUSTOMER_SESSION_TTL_MS,
  SESSION_COOKIES,
  createCustomerToken,
  sessionCookieOptions,
} from '@/infra/auth/session';
import { fail, ok, toErrorResponse } from '@/infra/http';
import { AccountError } from '@/core/services/accounts';
import { AUTH_LIMITS, checkRateLimit, clearRateLimit, clientKey } from '@/infra/auth/rate-limit';

export async function POST(request: Request) {
  try {
    // Brute-force protection. Checked before password verification, because
    // PBKDF2 at 210k iterations is expensive enough to be a DoS amplifier.
    const bucket = clientKey(request, 'login');
    const limited = checkRateLimit(bucket, AUTH_LIMITS.login);
    if (!limited.allowed) {
      return fail(
        `Too many sign-in attempts. Try again in ${limited.retryAfterSeconds} seconds.`,
        429,
        'RATE_LIMITED',
        undefined,
        { 'Retry-After': String(limited.retryAfterSeconds) },
      );
    }

    const input = loginSchema.parse(await request.json());
    const services = await getAppServices();
    const customer = await services.accounts.login(input.email, input.password);

    // A successful sign-in clears the bucket so a shared NAT is not penalised.
    clearRateLimit(bucket);

    const response = ok({ customer });
    response.cookies.set({
      name: SESSION_COOKIES.customer,
      value: createCustomerToken(customer.id, customer.email),
      ...sessionCookieOptions(CUSTOMER_SESSION_TTL_MS / 1000),
    });
    return response;
  } catch (error) {
    if (error instanceof AccountError) return fail(error.message, 401, error.code);
    return toErrorResponse(error);
  }
}
