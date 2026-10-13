import { getAppServices } from '@/infra/db';
import { readAdminSession } from '@/infra/auth/guards';
import { sanitizeUploadKey } from '@/infra/storage';
import { fail, toErrorResponse } from '@/infra/http';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const token = searchParams.get('token');

    if (!key) {
      return fail('No storage key provided.', 400, 'NO_KEY');
    }

    const safeKey = sanitizeUploadKey(key);
    if (!safeKey) {
      return fail('Invalid storage key.', 400, 'INVALID_KEY');
    }

    const services = await getAppServices();
    const admin = await readAdminSession();
    const isAdmin = admin !== null;

    // Check if the image exists in our database registry
    const imageRecord = await services.repos.images.findByKey(safeKey);

    // If it's a product image (artwork) or admin, allow
    const isProductKind = safeKey.startsWith('products/') || (imageRecord && imageRecord.kind === 'product');

    if (!isAdmin && !isProductKind) {
      if (!imageRecord) {
        return fail('Image record not found.', 404, 'NOT_FOUND');
      }
      if (!token || imageRecord.token !== token) {
        return fail('Unauthorized access to customer photograph.', 403, 'FORBIDDEN');
      }
    }

    if (!services.repos.storage.get) {
      return fail('Storage read operation not available.', 500, 'NOT_IMPLEMENTED');
    }

    const file = await services.repos.storage.get(safeKey);
    if (!file) {
      return fail('Image not found in storage.', 404, 'NOT_FOUND');
    }

    return new Response(new Uint8Array(file.body), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Cache-Control': 'private, no-transform, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
