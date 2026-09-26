/**
 * Prints an ADMIN_PASSWORD_HASH for `.env`.
 *
 *   npx tsx scripts/hash-password.ts 'your password'
 */
import { hashPasswordSync, verifyPasswordSync } from '../src/infra/auth/password';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npx tsx scripts/hash-password.ts \'<password>\'');
  process.exit(1);
}

const hash = hashPasswordSync(password);

if (!verifyPasswordSync(password, hash)) {
  console.error('Internal error: the generated hash did not verify.');
  process.exit(1);
}

console.log('ADMIN_PASSWORD_HASH=' + hash);
