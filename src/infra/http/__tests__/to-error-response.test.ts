import { afterEach, describe, expect, it, vi } from 'vitest';
import { toErrorResponse } from '../../http';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('toErrorResponse', () => {
  it('returns the original message and nested causes for unhandled errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const rootCause = new Error('relation "customers" does not exist');
    const databaseError = Object.assign(new Error('Database query failed'), { cause: rootCause });

    const response = toErrorResponse(databaseError);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      success: false,
      code: 'INTERNAL',
      error: 'Database query failed\nCaused by: relation "customers" does not exist',
    });
    expect(payload.error).not.toContain(databaseError.stack);
    expect(log).toHaveBeenCalledWith('[karkana] Unhandled API error:', databaseError);
  });

  it('handles non-Error thrown values without reverting to the generic message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = toErrorResponse('connection timed out');
    const payload = await response.json();

    expect(payload.error).toBe('connection timed out');
  });
});
