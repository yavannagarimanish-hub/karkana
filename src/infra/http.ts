import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { fieldIssues } from '@/core/schemas/common';
import { HttpError } from './auth/guards';

/**
 * Every `/api/v1` response uses the same envelope so clients have exactly one
 * shape to parse: `{ success: true, …data }` or `{ success: false, error, code, issues? }`.
 */

export function ok<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function fail(
  message: string,
  status: number,
  code = 'ERROR',
  issues?: unknown,
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    { success: false, error: message, code, ...(issues ? { issues } : {}) },
    { status, headers },
  );
}

/** Maps domain/infra errors onto HTTP status codes in one place. */
function errorMessageWithCauses(error: unknown): string {
  const messages: string[] = [];
  const seen = new Set<object>();
  let current: unknown = error;

  while (current !== null && current !== undefined) {
    if (typeof current === 'object') {
      if (seen.has(current)) break;
      seen.add(current);

      const nested = current as { message?: unknown; cause?: unknown };
      const message = typeof nested.message === 'string' ? nested.message : String(current);
      if (message) messages.push(message);
      current = nested.cause;
    } else {
      messages.push(String(current));
      break;
    }
  }

  return messages.join('\nCaused by: ') || 'An unknown error occurred.';
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return fail(error.message, error.status, error.code);
  }

  if (error instanceof ZodError) {
    const issues = fieldIssues(error);
    return fail(issues[0]?.message ?? 'The request failed validation.', 422, 'VALIDATION', issues);
  }

  const named = error as { name?: string; code?: string; message?: string };

  switch (named?.name) {
    case 'PricingError':
      return fail(named.message ?? 'The cart could not be priced.', 422, named.code ?? 'PRICING');
    case 'CheckoutError':
      // MIN_ORDER and friends are client-fixable, so 422 rather than 500.
      return fail(named.message ?? 'The order could not be placed.', 422, named.code ?? 'CHECKOUT');
    case 'OrderError':
      return fail(named.message ?? 'Order error.', named.code === 'NOT_FOUND' ? 404 : named.code === 'FORBIDDEN' ? 403 : 409, named.code ?? 'ORDER');
    case 'AccountError':
      return fail(named.message ?? 'Account error.', named.code === 'EMAIL_TAKEN' ? 409 : 401, named.code ?? 'ACCOUNT');
    case 'AdminError':
      return fail(named.message ?? 'Admin error.', named.code === 'NOT_FOUND' ? 404 : 409, named.code ?? 'ADMIN');
    default:
      break;
  }

  console.error('[karkana] Unhandled API error:', error);
  return fail(errorMessageWithCauses(error), 500, 'INTERNAL');
}

/** Wraps a route handler so thrown errors become structured responses. */
export function handler<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse>,
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
