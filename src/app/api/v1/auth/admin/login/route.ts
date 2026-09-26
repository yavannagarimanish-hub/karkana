import { adminLoginSchema } from '@/core/schemas/account';
import { verifyAdminCredentials, isAdminConfigured } from '@/infra/auth/admin';
import {
  ADMIN_SESSION_TTL_MS,
  SESSION_COOKIES,
  createAdminToken,
  sessionCookieOptions,
} from '@/infra/auth/session';
import { fail, ok, toErrorResponse } from '@/infra/http';
import { AUTH_LIMITS, checkRateLimit, clearRateLimit, clientKey } from '@/infra/auth/rate-limit';

export async function POST(request: Request) {
  try {
    const bucket = clientKey(request, 'admin-login');
    const limited = checkRateLimit(bucket, AUTH_LIMITS.adminLogin);
    if (!limited.allowed) {
      return fail(
        `Too many sign-in attempts. Try again in ${limited.retryAfterSeconds} seconds.`,
        429,
        'RATE_LIMITED',
        undefined,
        { 'Retry-After': String(limited.retryAfterSeconds) },
      );
    }

    const input = adminLoginSchema.parse(await request.json());

    if (!isAdminConfigured()) {
      return fail(
        'Administrator login is not configured on this deployment.',
        503,
        'ADMIN_NOT_CONFIGURED',
      );
    }

    if (!verifyAdminCredentials(input.username, input.password)) {
      return fail('Invalid username or password.', 401, 'INVALID_CREDENTIALS');
    }

    clearRateLimit(bucket);

    const response = ok({ username: input.username });
    response.cookies.set({
      name: SESSION_COOKIES.admin,
      value: createAdminToken(input.username),
      ...sessionCookieOptions(ADMIN_SESSION_TTL_MS / 1000),
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
