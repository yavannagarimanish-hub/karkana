import { z } from 'zod';
import { getAppServices } from '@/infra/db';
import { ok, toErrorResponse } from '@/infra/http';

/**
 * Prices a cart. The client sends ids and quantities only; every price in the
 * response is read from the catalogue here. Lines that are no longer
 * purchasable come back in `unavailable` instead of failing the whole request.
 */
const quoteSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(80),
        quantity: z.number().int().min(1).max(99),
        personalizationImage: z.string().trim().max(500).nullish(),
        customizationNotes: z.string().trim().max(1000).nullish(),
      }),
    )
    .max(200),
});

export async function POST(request: Request) {
  try {
    const { lines } = quoteSchema.parse(await request.json());
    const services = await getAppServices();
    const quote = await services.checkout.quote(lines);

    return ok({
      lines: quote.totals.lines,
      totals: {
        subtotalPaise: quote.totals.subtotalPaise,
        feesPaise: quote.totals.feesPaise,
        shippingPaise: quote.totals.shippingPaise,
        totalPaise: quote.totals.totalPaise,
        itemCount: quote.totals.itemCount,
      },
      unavailable: quote.unavailable,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
