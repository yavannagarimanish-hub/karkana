import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { sessionSecret } from '../env';

/**
 * Stateless HMAC-SHA256 session tokens: `base64url(payload).base64url(sig)`.
 *
 * Uses `node:crypto` rather than WebCrypto because Next 16 runs `proxy.ts` on
 * the Node.js runtime, so the same module works in the proxy, in route
 * handlers and in server components.
 */

export type SessionRole = 'admin' | 'customer';

export interface SessionPayload {
  /** Customer id, or the admin username for admin sessions. */
  sub: string;
  role: SessionRole;
  email: string;
  /** Unix milliseconds. */
  exp: number;
  /** Random per-session id, so two logins never share a token. */
  sid: string;
}

export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const CUSTOMER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export { SESSION_COOKIES } from './cookie-names';

function base64UrlEncode(input: Buffer | Uint8Array): string {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

function sign(payloadB64: string): string {
  return createHmac('sha256', sessionSecret()).update(payloadB64).digest('base64url');
}

export function signSession(
  payload: Omit<SessionPayload, 'sid'> & { sid?: string },
): string {
  const full: SessionPayload = { ...payload, sid: payload.sid ?? randomBytes(12).toString('hex') };
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(full), 'utf8'));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const separator = token.indexOf('.');
  if (separator <= 0) return null;

  const payloadB64 = token.slice(0, separator);
  const signatureB64 = token.slice(separator + 1);
  if (!payloadB64 || !signatureB64) return null;

  const expected = Buffer.from(sign(payloadB64), 'utf8');
  const provided = Buffer.from(signatureB64, 'utf8');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8')) as SessionPayload;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    if (payload.role !== 'admin' && payload.role !== 'customer') return null;
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function createAdminToken(username: string, email = username): string {
  return signSession({
    sub: username,
    role: 'admin',
    email,
    exp: Date.now() + ADMIN_SESSION_TTL_MS,
  });
}

export function createCustomerToken(customerId: string, email: string): string {
  return signSession({
    sub: customerId,
    role: 'customer',
    email,
    exp: Date.now() + CUSTOMER_SESSION_TTL_MS,
  });
}
