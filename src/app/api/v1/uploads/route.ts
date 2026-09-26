import { randomBytes } from 'node:crypto';
import { getAppServices } from '@/infra/db';
import { requireAdmin } from '@/infra/auth/guards';
import { fail, ok, toErrorResponse } from '@/infra/http';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

/**
 * Uploads land in object storage when it is configured, and on the local disk
 * otherwise (development only). `product` uploads require an admin session;
 * `personalization` uploads are customer-facing.
 */
export async function POST(request: Request) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail('Expected a multipart/form-data body.', 400, 'BAD_FORM');
    }

    const file = form.get('file');
    const kind = String(form.get('kind') ?? 'personalization');

    if (!(file instanceof File)) {
      return fail('No file was provided.', 400, 'NO_FILE');
    }
    if (kind !== 'product' && kind !== 'personalization') {
      return fail('Unknown upload kind.', 400, 'BAD_KIND');
    }
    if (kind === 'product') {
      await requireAdmin();
    }
    if (file.size === 0) {
      return fail('The file is empty.', 400, 'EMPTY_FILE');
    }
    if (file.size > MAX_BYTES) {
      return fail('Files must be 10 MB or smaller.', 413, 'FILE_TOO_LARGE');
    }

    const extension = ALLOWED.get(file.type);
    if (!extension) {
      return fail('Only JPG, PNG, WebP and GIF images are accepted.', 415, 'BAD_TYPE');
    }

    const stamp = new Date();
    const folder =
      kind === 'product'
        ? 'products'
        : `personalizations/${stamp.getUTCFullYear()}/${String(stamp.getUTCMonth() + 1).padStart(2, '0')}`;
    const key = `${folder}/${stamp.getTime()}_${randomBytes(6).toString('hex')}.${extension}`;

    const services = await getAppServices();
    const stored = await services.repos.storage.put(key, Buffer.from(await file.arrayBuffer()), file.type);

    return ok({ url: stored.url, key: stored.key, size: stored.size }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
