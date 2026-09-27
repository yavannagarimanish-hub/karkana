import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MetadataRoute } from 'next';
import { MODULE_SLUGS } from '@/core/domain/product';
import { SITE } from '@/infra/config';
import { getAppServices } from '@/infra/db';
import sitemap from '../sitemap';

vi.mock('@/infra/db', () => ({
  getAppServices: vi.fn(),
}));

const getAppServicesMock = vi.mocked(getAppServices);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sitemap', () => {
  it('returns static and module URLs when the database is unavailable', async () => {
    const databaseError = new Error('database connection refused');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    getAppServicesMock.mockRejectedValue(databaseError);

    const result = await sitemap();
    const urls = result.map(({ url }) => url);

    expect(urls).toContain(SITE.url);
    expect(urls).toContain(`${SITE.url}/search`);
    expect(Object.values(MODULE_SLUGS).map((slug) => `${SITE.url}/module/${slug}`).every((url) => urls.includes(url))).toBe(true);
    expect(urls.some((url) => url.includes('/product/'))).toBe(false);
    expect(log).toHaveBeenCalledWith(
      '[karkana] Could not load products for sitemap; using static routes:',
      databaseError,
    );
    log.mockRestore();
  });

  it('also degrades when a catalogue query fails after services are created', async () => {
    const databaseError = new Error('relation "products" does not exist');
    getAppServicesMock.mockResolvedValue({
      catalogue: { modulePage: vi.fn().mockRejectedValue(databaseError) },
    } as never);

    const result: MetadataRoute.Sitemap = await sitemap();

    expect(result.length).toBe(4 + Object.keys(MODULE_SLUGS).length);
    expect(result.every(({ url }) => !url.includes('/product/'))).toBe(true);
  });
});
