import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  cafeMenuItemImageKey,
  publicMenuImageUrl,
} from '@moonshot/types';
import {
  buildMenuThumbnailWebp,
  detectMenuImageMime,
  MenuImageValidationError,
} from './menu-image-process.js';

export { MenuImageValidationError } from './menu-image-process.js';

export type MenuImageStorageConfig = {
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

let cachedClient: S3Client | null = null;
let cachedConfig: MenuImageStorageConfig | null = null;

export function isMenuImageStorageConfigured(): boolean {
  return readMenuImageStorageConfig() != null;
}

export function readMenuImageStorageConfig(): MenuImageStorageConfig | null {
  const bucket = process.env.MENU_IMAGE_BUCKET?.trim();
  const endpoint = process.env.MENU_IMAGE_ENDPOINT?.trim();
  const region = process.env.MENU_IMAGE_REGION?.trim() || 'auto';
  const accessKeyId = process.env.MENU_IMAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.MENU_IMAGE_SECRET_ACCESS_KEY?.trim();
  const publicBaseUrl = process.env.MENU_IMAGE_PUBLIC_BASE_URL?.trim();

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    return null;
  }

  return {
    bucket,
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
  };
}

function getS3Client(config: MenuImageStorageConfig): S3Client {
  if (cachedClient && cachedConfig === config) {
    return cachedClient;
  }
  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
  cachedConfig = config;
  return cachedClient;
}

export async function uploadMenuImageObject(params: {
  objectKey: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  const config = readMenuImageStorageConfig();
  if (!config) {
    throw new MenuImageValidationError('Menu image storage is not configured', 503);
  }

  const client = getS3Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: params.objectKey,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl ?? 'public, max-age=31536000, immutable',
    }),
  );

  return publicMenuImageUrl(config.publicBaseUrl, params.objectKey);
}

export async function uploadMenuItemThumbnail(params: {
  cafeId: string;
  itemId: string;
  fileBuffer: Buffer;
}): Promise<string> {
  await detectMenuImageMime(params.fileBuffer);
  const webp = await buildMenuThumbnailWebp(params.fileBuffer);
  const objectKey = cafeMenuItemImageKey(params.cafeId, params.itemId);
  return uploadMenuImageObject({
    objectKey,
    body: webp,
    contentType: 'image/webp',
  });
}

export async function uploadRawWebpObject(params: {
  objectKey: string;
  body: Buffer;
}): Promise<string> {
  return uploadMenuImageObject({
    objectKey: params.objectKey,
    body: params.body,
    contentType: 'image/webp',
  });
}

/** Test hook — reset cached S3 client between tests. */
export function resetMenuImageStorageCacheForTests(): void {
  cachedClient = null;
  cachedConfig = null;
}
