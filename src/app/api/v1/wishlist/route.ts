import { getAppServices } from '@/infra/db';
import { requireCustomer } from '@/infra/auth/guards';
import { wishlistToggleSchema } from '@/core/schemas/account';
import { ok, toErrorResponse } from '@/infra/http';

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    const { productId } = wishlistToggleSchema.parse(await request.json());

    const services = await getAppServices();
    const product = await services.repos.products.findById(productId);
    if (!product) {
      return ok({ wishlisted: false, error: 'UNKNOWN_PRODUCT' }, 404);
    }

    const wishlisted = await services.accounts.toggleWishlist(session.sub, productId);
    return ok({ wishlisted, productId });
  } catch (error) {
    return toErrorResponse(error);
  }
}
