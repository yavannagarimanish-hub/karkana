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

  // Accept the primary operator username and, if set, an alternate one. Either
  // the full address or just its local part ("admin" for "admin@…") matches.
  const accepted = [env.ADMIN_USERNAME, env.ADMIN_USERNAME_ALT]
    .filter((value): value is string => Boolean(value && value.trim()))
    .flatMap((value) => {
      const full = value.trim().toLowerCase();
      return [full, full.split('@')[0]];
    });

  if (!accepted.includes(provided)) {
    return false;
  }

  return verifyPasswordSync(password, hash);
}
