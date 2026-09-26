import { SESSION_COOKIES, sessionCookieOptions } from '@/infra/auth/session';
import { ok } from '@/infra/http';

export async function POST() {
  const response = ok({ signedOut: true });
  response.cookies.set({
    name: SESSION_COOKIES.admin,
    value: '',
    ...sessionCookieOptions(0),
  });
  return response;
}
