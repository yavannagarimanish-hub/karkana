/**
 * Cookie names live in their own dependency-free module so `src/proxy.ts`
 * can read them without importing the session signer (and the env layer).
 */
export const SESSION_COOKIES = {
  admin: 'karkana_admin',
  customer: 'karkana_session',
} as const;
