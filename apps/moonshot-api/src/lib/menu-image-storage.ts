import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
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

export class MenuImageNotFoundError extends Error {
  readonly status = 404;

  constructor(message = 'Image not found') {
    super(message);
    this.name = 'MenuImageNotFoundError';
  }
}

export type MenuImageObject = {
  body: Readable;
  contentType: string;
  contentLength?: number;
  cacheControl: string;
};

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

/** Fetch a stored menu image for the public media proxy. */
export async function getMenuImageObject(objectKey: string): Promise<MenuImageObject> {
  const config = readMenuImageStorageConfig();
  if (!config) {
    throw new MenuImageValidationError('Menu image storage is not configured', 503);
  }

  const client = getS3Client(config);
  try {
    const out = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
    );

    if (!out.Body) {
      throw new MenuImageNotFoundError();
    }

    return {
      body: out.Body as Readable,
      contentType: out.ContentType ?? 'image/webp',
      contentLength: out.ContentLength,
      cacheControl: out.CacheControl ?? 'public, max-age=31536000, immutable',
    };
  } catch (e) {
    if (e instanceof MenuImageNotFoundError || e instanceof MenuImageValidationError) {
      throw e;
    }
    const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: unknown }).name) : '';
    const httpStatus =
      e && typeof e === 'object' && '$metadata' in e
        ? (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : undefined;
    if (name === 'NoSuchKey' || name === 'NotFound' || httpStatus === 404) {
      throw new MenuImageNotFoundError();
    }
    throw e;
  }
}

/** Test hook — reset cached S3 client between tests. */
export function resetMenuImageStorageCacheForTests(): void {
  cachedClient = null;
  cachedConfig = null;
}
