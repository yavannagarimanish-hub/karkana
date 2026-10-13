import sharp from 'sharp';

export interface ValidatedImage {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  extension: 'jpg' | 'png' | 'webp' | 'gif';
  format: string;
}

export class ImageValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

export function detectImageFormat(buffer: Buffer): 'jpeg' | 'png' | 'webp' | 'gif' | 'heic' | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF .... WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  // GIF: GIF87a or GIF89a
  const gifHeader = buffer.toString('ascii', 0, 6);
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return 'gif';
  }

  // HEIC / HEIF: bytes 4-8 are 'ftyp' and brand is heic, heix, hevc, hevx, mif1, msf1
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12).toLowerCase();
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
      return 'heic';
    }
  }

  return null;
}

export async function validateAndNormalizeImage(
  rawBuffer: Buffer,
  originalFilename: string,
): Promise<ValidatedImage> {
  const ext = originalFilename.includes('.')
    ? originalFilename.split('.').pop()?.toLowerCase() ?? ''
    : '';

  const suspiciousExtensions = ['exe', 'bat', 'sh', 'php', 'js', 'html', 'py', 'svg', 'zip', 'tar', 'dll'];
  if (suspiciousExtensions.includes(ext)) {
    throw new ImageValidationError(
      'MISLEADING_EXTENSION',
      'The file extension is not permitted.',
      400,
    );
  }

  const format = detectImageFormat(rawBuffer);

  if (!format) {
    throw new ImageValidationError(
      'BAD_SIGNATURE',
      'The file is not a supported image format (JPEG, PNG, WebP or HEIC).',
      415,
    );
  }

  if (format === 'heic') {
    try {
      const converted = await sharp(rawBuffer).jpeg({ quality: 90 }).toBuffer();
      return {
        buffer: converted,
        mimeType: 'image/jpeg',
        extension: 'jpg',
        format: 'jpeg',
      };
    } catch {
      throw new ImageValidationError(
        'HEIC_CONVERSION_FAILED',
        'Could not process HEIC image. Please upload a JPEG, PNG or WebP file.',
        422,
      );
    }
  }

  // Validate image integrity with sharp
  try {
    const metadata = await sharp(rawBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }
  } catch (err) {
    if (err instanceof ImageValidationError) throw err;
    throw new ImageValidationError(
      'CORRUPT_IMAGE',
      'The uploaded image file appears to be corrupted or invalid.',
      422,
    );
  }

  const mimeMap = {
    jpeg: 'image/jpeg' as const,
    png: 'image/png' as const,
    webp: 'image/webp' as const,
    gif: 'image/gif' as const,
  };

  const extMap = {
    jpeg: 'jpg' as const,
    png: 'png' as const,
    webp: 'webp' as const,
    gif: 'gif' as const,
  };

  return {
    buffer: rawBuffer,
    mimeType: mimeMap[format],
    extension: extMap[format],
    format,
  };
}
