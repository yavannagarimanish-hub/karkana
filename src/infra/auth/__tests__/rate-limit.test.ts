import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AUTH_LIMITS,
  checkRateLimit,
  clearRateLimit,
  clientKey,
  resetRateLimits,
} from '../rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits());
  afterEach(() => resetRateLimits());

  it('allows requests up to the limit', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(checkRateLimit('login:1.2.3.4', { limit: 5, windowMs: 60_000 }).allowed).toBe(true);
    }
  });

  it('blocks the request after the limit and reports a retry delay', () => {
    for (let i = 0; i < 5; i += 1) checkRateLimit('login:1.2.3.4', { limit: 5, windowMs: 60_000 });

    const blocked = checkRateLimit('login:1.2.3.4', { limit: 5, windowMs: 60_000 });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('counts remaining attempts down', () => {
    expect(checkRateLimit('k', { limit: 3, windowMs: 60_000 }).remaining).toBe(2);
    expect(checkRateLimit('k', { limit: 3, windowMs: 60_000 }).remaining).toBe(1);
    expect(checkRateLimit('k', { limit: 3, windowMs: 60_000 }).remaining).toBe(0);
  });

  it('keeps separate keys separate, so one IP cannot lock out another', () => {
    for (let i = 0; i < 5; i += 1) checkRateLimit('login:attacker', { limit: 5, windowMs: 60_000 });

    expect(checkRateLimit('login:attacker', { limit: 5, windowMs: 60_000 }).allowed).toBe(false);
    expect(checkRateLimit('login:victim', { limit: 5, windowMs: 60_000 }).allowed).toBe(true);
  });

  it('lets a successful sign-in clear the bucket', () => {
    for (let i = 0; i < 5; i += 1) checkRateLimit('login:1.2.3.4', { limit: 5, windowMs: 60_000 });
    expect(checkRateLimit('login:1.2.3.4', { limit: 5, windowMs: 60_000 }).allowed).toBe(false);

    clearRateLimit('login:1.2.3.4');

    expect(checkRateLimit('login:1.2.3.4', { limit: 5, windowMs: 60_000 }).allowed).toBe(true);
  });

  it('reopens once the window has elapsed', () => {
    const key = 'login:1.2.3.4';
    for (let i = 0; i < 3; i += 1) checkRateLimit(key, { limit: 3, windowMs: 50 });
    expect(checkRateLimit(key, { limit: 3, windowMs: 50 }).allowed).toBe(false);

    const start = Date.now();
    while (Date.now() - start < 70) {
      // spin past the window
    }

    expect(checkRateLimit(key, { limit: 3, windowMs: 50 }).allowed).toBe(true);
  });

  it('enforces the shipped presets as intended', () => {
    expect(AUTH_LIMITS.login.limit).toBe(10);
    expect(AUTH_LIMITS.adminLogin.limit).toBeLessThan(AUTH_LIMITS.login.limit);
    expect(AUTH_LIMITS.register.limit).toBe(5);
  });
});

describe('clientKey', () => {
  function request(headers: Record<string, string>): Request {
    return new Request('http://localhost/api/v1/auth/login', { method: 'POST', headers });
  }

  it('uses the first X-Forwarded-For entry', () => {
    const key = clientKey(request({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }), 'login');
    expect(key).toBe('login:203.0.113.9');
  });

  it('falls back to X-Real-IP', () => {
    expect(clientKey(request({ 'x-real-ip': '198.51.100.4' }), 'admin-login')).toBe(
      'admin-login:198.51.100.4',
    );
  });

  it('still produces a usable key when no IP header is present', () => {
    expect(clientKey(request({}), 'login')).toBe('login:unknown');
  });

  it('scopes by action so login attempts cannot exhaust the admin budget', () => {
    expect(clientKey(request({ 'x-real-ip': '1.1.1.1' }), 'login')).not.toBe(
      clientKey(request({ 'x-real-ip': '1.1.1.1' }), 'admin-login'),
    );
  });
});
