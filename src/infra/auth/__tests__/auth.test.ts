import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashPasswordSync, verifyPasswordSync } from '../password';

const SECRET = 'a'.repeat(48);

const env = process.env as Record<string, string | undefined>;

describe('session tokens', () => {
  const originalSecret = process.env.KARKANA_SESSION_SECRET;
  const originalEnv = env.NODE_ENV;

  /** The signer memoises its secret, so each test loads a fresh module. */
  async function loadSession(secret = SECRET) {
    env.KARKANA_SESSION_SECRET = secret;
    env.NODE_ENV = 'test';
    vi.resetModules();
    return import('../session');
  }

  afterEach(() => {
    env.KARKANA_SESSION_SECRET = originalSecret;
    env.NODE_ENV = originalEnv;
    vi.resetModules();
  });

  it('round-trips a customer token', async () => {
    const session = await loadSession();
    const parsed = session.verifySession(session.createCustomerToken('cus_42', 'meena@example.com'));

    expect(parsed).toMatchObject({ sub: 'cus_42', role: 'customer', email: 'meena@example.com' });
    expect(parsed?.sid).toBeTruthy();
  });

  it('round-trips an admin token', async () => {
    const session = await loadSession();
    expect(session.verifySession(session.createAdminToken('admin@karkana.com'))?.role).toBe('admin');
  });

  it('rejects a tampered payload', async () => {
    const session = await loadSession();
    const token = session.createCustomerToken('cus_42', 'meena@example.com');
    const [payload, signature] = token.split('.');

    const forged = Buffer.from(
      JSON.stringify({ sub: 'cus_admin', role: 'admin', email: 'x', exp: Date.now() + 10_000, sid: 'x' }),
    ).toString('base64url');

    expect(session.verifySession(`${forged}.${signature}`)).toBeNull();
    expect(session.verifySession(`${payload}.AAAA`)).toBeNull();
  });

  it('rejects a signature made with a different secret', async () => {
    const signer = await loadSession();
    const token = signer.signSession({
      sub: 'cus_1',
      role: 'customer',
      email: 'a@b.c',
      exp: Date.now() + 60_000,
    });

    const otherVerifier = await loadSession('b'.repeat(48));
    expect(otherVerifier.verifySession(token)).toBeNull();
  });

  it('rejects expired tokens', async () => {
    const session = await loadSession();
    const token = session.signSession({ sub: 'cus_1', role: 'customer', email: 'a@b.c', exp: Date.now() - 1000 });
    expect(session.verifySession(token)).toBeNull();
  });

  it('rejects malformed input', async () => {
    const session = await loadSession();
    for (const value of ['', 'abc', 'a.b', 'a.b.c', 'null', undefined, null]) {
      expect(session.verifySession(value as string)).toBeNull();
    }
  });

  it('issues a distinct sid per login', async () => {
    const session = await loadSession();
    const first = session.verifySession(session.createCustomerToken('cus_1', 'a@b.c'));
    const second = session.verifySession(session.createCustomerToken('cus_1', 'a@b.c'));
    expect(first?.sid).not.toBe(second?.sid);
  });

  it('uses a 12-hour admin TTL', async () => {
    const session = await loadSession();
    const parsed = session.verifySession(session.createAdminToken('admin'));

    expect((parsed?.exp ?? 0) - Date.now()).toBeLessThanOrEqual(session.ADMIN_SESSION_TTL_MS);
    expect((parsed?.exp ?? 0) - Date.now()).toBeGreaterThan(session.ADMIN_SESSION_TTL_MS - 60_000);
  });
});

describe('password hashing', () => {
  it('verifies a correct password', () => {
    const hash = hashPasswordSync('Sup3rSecret');
    expect(verifyPasswordSync('Sup3rSecret', hash)).toBe(true);
  });

  it('rejects a wrong password', () => {
    const hash = hashPasswordSync('Sup3rSecret');
    expect(verifyPasswordSync('sup3rsecret', hash)).toBe(false);
  });

  it('salts every hash differently', () => {
    expect(hashPasswordSync('Sup3rSecret')).not.toBe(hashPasswordSync('Sup3rSecret'));
  });

  it('rejects malformed or legacy hashes', () => {
    expect(verifyPasswordSync('x', 'not-a-hash')).toBe(false);
    expect(verifyPasswordSync('x', 'pbkdf2$10$aa$bb')).toBe(false);
    expect(verifyPasswordSync('x', '')).toBe(false);
  });
});

describe('admin credentials', () => {
  const original = { ...process.env };

  /** `src/infra/env.ts` snapshots process.env at import time. */
  async function loadAdmin(vars: Record<string, string | undefined>) {
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.resetModules();
    return import('../admin');
  }

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  it('refuses login when no hash is configured', async () => {
    const admin = await loadAdmin({ ADMIN_PASSWORD_HASH: undefined });

    expect(admin.isAdminConfigured()).toBe(false);
    expect(admin.verifyAdminCredentials('admin', 'anything')).toBe(false);
  });

  it('accepts the configured operator', async () => {
    const admin = await loadAdmin({
      ADMIN_USERNAME: 'admin@karkana.com',
      ADMIN_PASSWORD_HASH: hashPasswordSync('Sup3rSecret'),
    });

    expect(admin.isAdminConfigured()).toBe(true);
    expect(admin.verifyAdminCredentials('admin@karkana.com', 'Sup3rSecret')).toBe(true);
    expect(admin.verifyAdminCredentials('admin', 'Sup3rSecret')).toBe(true);
    expect(admin.verifyAdminCredentials('ADMIN@KARKANA.COM', 'Sup3rSecret')).toBe(true);
  });

  it('rejects a wrong password and a wrong username', async () => {
    const admin = await loadAdmin({
      ADMIN_USERNAME: 'admin@karkana.com',
      ADMIN_PASSWORD_HASH: hashPasswordSync('Sup3rSecret'),
    });

    expect(admin.verifyAdminCredentials('admin', 'nope')).toBe(false);
    expect(admin.verifyAdminCredentials('intruder', 'Sup3rSecret')).toBe(false);
  });

  it('rejects a legacy or malformed hash instead of crashing', async () => {
    const admin = await loadAdmin({
      ADMIN_USERNAME: 'admin@karkana.com',
      ADMIN_PASSWORD_HASH: 'not-a-valid-hash',
    });

    expect(admin.verifyAdminCredentials('admin', 'Sup3rSecret')).toBe(false);
  });
});
