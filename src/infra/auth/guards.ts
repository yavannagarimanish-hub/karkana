import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIES, verifySession, type SessionPayload } from './session';

/**
 * The authoritative authorization layer.
 *
 * Next 16 documents `proxy.ts` as unsuitable for authorization, so every
 * protected route handler, Server Action and admin layout calls one of these.
 * `src/proxy.ts` only performs *optimistic* redirects for a better UX.
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string = 'ERROR',
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

async function readCookie(name: string): Promise<string | undefined> {
  const store = await cookies();
  return store.get(name)?.value;
}

export async function readAdminSession(): Promise<SessionPayload | null> {
  const session = verifySession(await readCookie(SESSION_COOKIES.admin));
  return session?.role === 'admin' ? session : null;
}

export async function readCustomerSession(): Promise<SessionPayload | null> {
  const session = verifySession(await readCookie(SESSION_COOKIES.customer));
  return session?.role === 'customer' ? session : null;
}

/* ── API / Server Action guards: throw, never redirect ─────────────────── */

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await readAdminSession();
  if (!session) {
    throw new HttpError(401, 'An administrative session is required.', 'UNAUTHORIZED');
  }
  return session;
}

export async function requireCustomer(): Promise<SessionPayload> {
  const session = await readCustomerSession();
  if (!session) {
    throw new HttpError(401, 'Please sign in to continue.', 'UNAUTHORIZED');
  }
  return session;
}

/** Signed-in customer if present, `null` otherwise (guest checkout). */
export async function optionalCustomer(): Promise<SessionPayload | null> {
  return readCustomerSession();
}

/* ── Page guards: redirect instead of throwing ─────────────────────────── */

export async function requireAdminPage(): Promise<SessionPayload> {
  const session = await readAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}

export async function requireCustomerPage(next?: string): Promise<SessionPayload> {
  const session = await readCustomerSession();
  if (!session) {
    redirect(next ? `/account/login?next=${encodeURIComponent(next)}` : '/account/login');
  }
  return session;
}
