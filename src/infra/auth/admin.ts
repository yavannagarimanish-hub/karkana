import { env } from '../env';
import { verifyPasswordSync } from './password';

let warned = false;

export function isAdminConfigured(): boolean {
  return Boolean(env.ADMIN_PASSWORD_HASH && env.ADMIN_PASSWORD_HASH.trim().length > 0);
}

/**
 * Verifies the single operator account. The password hash lives in the
 * environment in the same `pbkdf2$…` format as customer passwords.
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  const hash = env.ADMIN_PASSWORD_HASH?.trim();
  if (!hash) {
    if (!warned) {
      warned = true;
      console.error(
        '[karkana] ADMIN_PASSWORD_HASH is not set, so admin login is disabled. ' +
          "Generate one with: npx tsx scripts/hash-password.ts '<password>'",
      );
    }
    return false;
  }

  const provided = username.trim().toLowerCase();
  const expected = env.ADMIN_USERNAME.trim().toLowerCase();
  const expectedLocalPart = expected.split('@')[0];

  if (provided !== expected && provided !== expectedLocalPart) {
    return false;
  }

  return verifyPasswordSync(password, hash);
}
