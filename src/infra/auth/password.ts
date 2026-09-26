import { pbkdf2, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasher } from '@/core/ports';

const pbkdf2Async = promisify(pbkdf2);

/**
 * PBKDF2-HMAC-SHA256, 210k iterations, per-password 16-byte salt.
 * Stored as `pbkdf2$<iterations>$<saltHex>$<hashHex>` so the parameters travel
 * with the hash and can be raised later without invalidating old passwords.
 *
 * (v1 used a single static salt from source, shared by every credential.)
 */
const ALGORITHM = 'sha256';
const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

export function hashPasswordSync(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const derived = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, ALGORITHM);
  return `pbkdf2$${ITERATIONS}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPasswordSync(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = Number(parts[1]);
  const salt = Buffer.from(parts[2] ?? '', 'hex');
  const expected = Buffer.from(parts[3] ?? '', 'hex');

  if (!Number.isInteger(iterations) || iterations < 1_000 || expected.length === 0 || salt.length === 0) {
    return false;
  }

  const candidate = pbkdf2Sync(password, salt, iterations, expected.length, ALGORITHM);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export const passwordHasher: PasswordHasher = {
  async hash(password: string) {
    const salt = randomBytes(SALT_LENGTH);
    const derived = await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH, ALGORITHM);
    return `pbkdf2$${ITERATIONS}$${salt.toString('hex')}$${derived.toString('hex')}`;
  },
  async verify(password: string, stored: string) {
    return verifyPasswordSync(password, stored);
  },
};
