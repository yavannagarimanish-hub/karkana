import crypto from 'crypto';
import { cookies } from 'next/headers';
import { verifySessionToken, SessionPayload } from './auth-token';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin@karkana.com';
const ADMIN_USERNAME_ALT = process.env.ADMIN_USERNAME_ALT || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const ADMIN_SALT = process.env.ADMIN_SALT || 'karkana_admin_salt_sec_2026';

export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, ADMIN_SALT, 100000, 64, 'sha512').toString('hex');
}

export function verifyCredentials(usernameInput: string, passwordInput: string): boolean {
  const normUser = usernameInput.trim().toLowerCase();
  const validUser =
    normUser === ADMIN_USERNAME.toLowerCase() ||
    normUser === ADMIN_USERNAME_ALT.toLowerCase();

  if (!validUser) return false;

  const candidateHash = hashPassword(passwordInput);

  if (!ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_HASH.length !== 128) {
    return false;
  }

  const expectedBuffer = Buffer.from(ADMIN_PASSWORD_HASH, 'hex');
  const candidateBuffer = Buffer.from(candidateHash, 'hex');

  if (expectedBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, candidateBuffer);
}

export async function getCurrentAdminSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('karkana_admin_session');

  if (!sessionCookie?.value) {
    return null;
  }

  return await verifySessionToken(sessionCookie.value);
}
