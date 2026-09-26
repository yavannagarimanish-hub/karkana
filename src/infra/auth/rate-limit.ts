/**
 * Fixed-window rate limiter for authentication endpoints.
 *
 * Without this, a credential-stuffing or brute-force run against
 * `/api/v1/auth/login` is unbounded: PBKDF2 at 210k iterations makes each
 * attempt expensive for the *server*, so an attacker can also use it as a
 * cheap denial-of-service amplification.
 *
 * This is a per-process in-memory limiter. That is deliberate: it needs no
 * shared state and is correct for a single instance. If the app is scaled to
 * multiple instances, move the counters to Redis and keep the same interface;
 * the limit then becomes per-instance rather than global, which is still a
 * large improvement over no limit at all.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

/** Sweep expired buckets so the map cannot grow without bound. */
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets. Present when blocked. */
  retryAfterSeconds?: number;
  remaining: number;
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  return { allowed: true, remaining: limit - existing.count };
}

/** Clear a bucket after a successful action, so honest users are not penalised. */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

/** Test hook. */
export function resetRateLimits(): void {
  buckets.clear();
  lastSweep = Date.now();
}

/**
 * Best-effort client identifier. Behind a proxy the real client is the first
 * entry in X-Forwarded-For; that header is attacker-controlled when the app is
 * exposed directly, so it is only ever used as one part of the key alongside
 * the route, never as a trust decision.
 */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = (forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip'))?.trim() || 'unknown';
  return `${scope}:${ip}`;
}

/** Presets tuned for a small storefront, not a high-traffic site. */
export const AUTH_LIMITS = {
  /** 10 password attempts per 10 minutes per IP. */
  login: { limit: 10, windowMs: 10 * 60_000 },
  /** 5 registrations per hour per IP stops bulk account creation. */
  register: { limit: 5, windowMs: 60 * 60_000 },
  /** Admin login is tighter: 5 per 15 minutes. */
  adminLogin: { limit: 5, windowMs: 15 * 60_000 },
} as const;
