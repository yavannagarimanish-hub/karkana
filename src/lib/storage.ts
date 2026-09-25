import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

let s3ClientInstance: S3Client | null = null;

export function isStorageConfigured(): boolean {
  const endpoint = process.env.B2_ENDPOINT || process.env.R2_ENDPOINT || process.env.S3_ENDPOINT;
  const bucket = process.env.B2_BUCKET || process.env.B2_BUCKET_NAME || process.env.R2_BUCKET || process.env.S3_BUCKET;
  const accessKeyId =
    process.env.B2_KEY_ID ||
    process.env.B2_APPLICATION_KEY_ID ||
    process.env.B2_ACCESS_KEY_ID ||
    process.env.R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.B2_APPLICATION_KEY ||
    process.env.B2_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY;

  return Boolean(endpoint && bucket && accessKeyId && secretAccessKey);
}

export const isR2Configured = isStorageConfigured;

export function getStorageClient(): S3Client {
  if (s3ClientInstance) {
    return s3ClientInstance;
  }

  let endpoint = process.env.B2_ENDPOINT || process.env.R2_ENDPOINT || process.env.S3_ENDPOINT;
  const accessKeyId =
    process.env.B2_KEY_ID ||
    process.env.B2_APPLICATION_KEY_ID ||
    process.env.B2_ACCESS_KEY_ID ||
    process.env.R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.B2_APPLICATION_KEY ||
    process.env.B2_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY;
  const region =
    process.env.B2_REGION ||
    process.env.R2_REGION ||
    process.env.AWS_REGION ||
    (endpoint && endpoint.includes('us-east-005') ? 'us-east-005' : 'auto');

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[Karkana Production] Fatal Error: Cloudflare R2 credentials (R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) or Backblaze B2 credentials (B2_ENDPOINT, B2_BUCKET, B2_KEY_ID, B2_APPLICATION_KEY) are not configured. Local storage fallback is strictly forbidden in production.'
      );
    }
    throw new Error('Object storage (B2/R2) credentials not configured.');
  }

  // Ensure endpoint has protocol
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = `https://${endpoint}`;
  }

  s3ClientInstance = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientInstance;
}

export const getR2Client = getStorageClient;

export function getBucketName(): string {
  const bucket =
    process.env.B2_BUCKET ||
    process.env.B2_BUCKET_NAME ||
    process.env.R2_BUCKET ||
    process.env.S3_BUCKET;
  if (!bucket) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[Karkana Production] R2_BUCKET or B2_BUCKET environment variable is missing.'
      );
    }
    return '';
  }
  return bucket;
}

export const getR2BucketName = getBucketName;

export async function uploadPersonalizationFile(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; key: string }> {
  const key = `personalizations/${filename}`;

  if (isR2Configured()) {
    const client = getR2Client();
    const bucket = getR2BucketName();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Cloudflare R2 / S3 private ACL by default; accessed via protected admin proxy
      })
    );

    // Protected admin proxy route URL
    return {
      url: `/api/admin/uploads/${key}`,
      key,
    };
  }

  // Development-only fallback
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[Karkana Production] Cloudflare R2 storage credentials are required. Silently storing files locally in production is forbidden.'
    );
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'personalizations');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  return {
    url: `/uploads/personalizations/${filename}`,
    key,
  };
}

export async function getPersonalizationAssetStream(key: string): Promise<{
  stream: NodeJS.ReadableStream | ReadableStream;
  contentType: string;
} | null> {
  if (isR2Configured()) {
    const client = getR2Client();
    const bucket = getR2BucketName();

    try {
      const res = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      if (!res.Body) return null;
      return {
        stream: res.Body as unknown as NodeJS.ReadableStream | ReadableStream,
        contentType: res.ContentType || 'image/jpeg',
      };
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'NoSuchKey') return null;
      throw err;
    }
  }

  // Development local disk fallback
  const localPath = path.join(process.cwd(), 'public', 'uploads', key);
  if (!fs.existsSync(localPath)) return null;

  const ext = path.extname(localPath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };

  return {
    stream: fs.createReadStream(localPath),
    contentType: mimeMap[ext] || 'application/octet-stream',
  };
}

