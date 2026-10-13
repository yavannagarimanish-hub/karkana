import { randomBytes } from 'node:crypto';
import { getAppServices } from '@/infra/db';
import { requireAdmin, optionalCustomer } from '@/infra/auth/guards';
import { fail, ok, toErrorResponse } from '@/infra/http';
import { sanitizeUploadKey } from '@/infra/storage';
import { ImageValidationError, validateAndNormalizeImage } from '@/infra/storage/image-validation';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Uploads land in persistent object storage (Backblaze B2 in production)
 * and in local storage only when B2 is unconfigured (development/test).
 *
 * `product` uploads require an administrative session.
 * `personalization` uploads are customer-facing and protected by secure access tokens.
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

    const rawBuffer = Buffer.from(await file.arrayBuffer());

    let validated;
    try {
      validated = await validateAndNormalizeImage(rawBuffer, file.name);
    } catch (valErr) {
      if (valErr instanceof ImageValidationError) {
        return fail(valErr.message, valErr.status, valErr.code);
      }
      throw valErr;
    }

    const stamp = new Date();
    const folder =
      kind === 'product'
        ? 'products'
        : `personalizations/${stamp.getUTCFullYear()}/${String(stamp.getUTCMonth() + 1).padStart(2, '0')}`;
    const rawKey = `${folder}/${stamp.getTime()}_${randomBytes(12).toString('hex')}.${validated.extension}`;
    const key = sanitizeUploadKey(rawKey);

    if (!key) {
      return fail('Generated an unsafe storage key.', 500, 'KEY_ERROR');
    }

    const services = await getAppServices();
    const stored = await services.repos.storage.put(key, validated.buffer, validated.mimeType);

    // Cryptographically secure token granting customer access to their uploaded photograph
    const token = randomBytes(24).toString('hex');
    const customer = await optionalCustomer();

    await services.repos.images.record({
      id: services.repos.ids.order(),
      storageKey: stored.key,
      token,
      originalFilename: file.name,
      mimeType: validated.mimeType,
      sizeBytes: validated.buffer.length,
      kind,
      customerId: customer?.sub ?? null,
    });

    const previewUrl = `/api/v1/uploads/preview?key=${encodeURIComponent(stored.key)}&token=${token}`;

    return ok(
      {
        url: previewUrl,
        previewUrl,
        key: stored.key,
        token,
        size: stored.size,
      },
      201,
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
