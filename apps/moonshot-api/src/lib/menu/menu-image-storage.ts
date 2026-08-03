import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { cafeMenuItemImageKey, menuImageObjectKeyFromPublicUrl, menuTemplateDrinkImageKey, newMenuItemImageVersion, publicMenuImageUrl, type MenuTemplateDrinkKey } from '@moonshot/domain';
import { parseAllowedMenuImageObjectKey } from './menu-image-object-key.js';
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

const MENU_IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

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

function isMissingObjectError(e: unknown): boolean {
  const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: unknown }).name) : '';
  const httpStatus =
    e && typeof e === 'object' && '$metadata' in e
      ? (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      : undefined;
  return name === 'NoSuchKey' || name === 'NotFound' || name === 'NoSuchBucket' || httpStatus === 404;
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
      CacheControl: params.cacheControl ?? MENU_IMAGE_CACHE_CONTROL,
    }),
  );

  return publicMenuImageUrl(config.publicBaseUrl, params.objectKey);
}

/**
 * Best-effort delete of a previous café upload. Skips template URLs and
 * unknown layouts so shared starter images are never removed.
 */
export async function deletePreviousCafeMenuItemImage(params: {
  cafeId: string;
  itemId: string;
  previousImageUrl: string | null | undefined;
}): Promise<void> {
  if (!params.previousImageUrl) return;

  const config = readMenuImageStorageConfig();
  if (!config) return;

  const objectKey = menuImageObjectKeyFromPublicUrl(
    params.previousImageUrl,
    config.publicBaseUrl,
  );
  if (!objectKey) return;

  const allowed = parseAllowedMenuImageObjectKey(objectKey);
  if (!allowed) return;

  const expectedPrefix = `cafes/${params.cafeId}/menu-items/${params.itemId}/`;
  if (!allowed.toLowerCase().startsWith(expectedPrefix.toLowerCase())) return;

  try {
    const client = getS3Client(config);
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: allowed,
      }),
    );
  } catch {
    // Non-fatal: orphaned objects are cheaper than failing an admin replace.
  }
}

/**
 * Copy a canonical template drink thumbnail into café-scoped storage for one
 * menu item. Café admins can later replace their copy without touching
 * `template/drinks/*`. Returns null when storage is off or the template object
 * is missing (run `pnpm sync:menu-template-images` first).
 */
export async function copyTemplateDrinkImageToCafeItem(params: {
  cafeId: string;
  itemId: string;
  templateKey: MenuTemplateDrinkKey;
}): Promise<string | null> {
  const config = readMenuImageStorageConfig();
  if (!config) return null;

  const sourceKey = menuTemplateDrinkImageKey(params.templateKey);
  const version = newMenuItemImageVersion();
  const destKey = cafeMenuItemImageKey(params.cafeId, params.itemId, version);
  const client = getS3Client(config);

  try {
    await client.send(
      new CopyObjectCommand({
        Bucket: config.bucket,
        // Path-style Railway buckets: bucket/key for CopySource.
        CopySource: `${config.bucket}/${sourceKey}`,
        Key: destKey,
        ContentType: 'image/webp',
        CacheControl: MENU_IMAGE_CACHE_CONTROL,
        MetadataDirective: 'REPLACE',
      }),
    );
    return publicMenuImageUrl(config.publicBaseUrl, destKey);
  } catch (e) {
    if (isMissingObjectError(e)) return null;
    throw e;
  }
}

export async function uploadMenuItemThumbnail(params: {
  cafeId: string;
  itemId: string;
  fileBuffer: Buffer;
  previousImageUrl?: string | null;
}): Promise<string> {
  await detectMenuImageMime(params.fileBuffer);
  const webp = await buildMenuThumbnailWebp(params.fileBuffer);
  const version = newMenuItemImageVersion();
  const objectKey = cafeMenuItemImageKey(params.cafeId, params.itemId, version);
  const url = await uploadMenuImageObject({
    objectKey,
    body: webp,
    contentType: 'image/webp',
  });

  await deletePreviousCafeMenuItemImage({
    cafeId: params.cafeId,
    itemId: params.itemId,
    previousImageUrl: params.previousImageUrl,
  });

  return url;
}

/** Superadmin / ops only — write canonical template objects under `template/`. */
export async function uploadRawWebpObject(params: {
  objectKey: string;
  body: Buffer;
}): Promise<string> {
  if (!params.objectKey.startsWith('template/')) {
    throw new MenuImageValidationError(
      'Raw WebP uploads are reserved for template/ object keys',
      400,
    );
  }
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
      cacheControl: out.CacheControl ?? MENU_IMAGE_CACHE_CONTROL,
    };
  } catch (e) {
    if (e instanceof MenuImageNotFoundError || e instanceof MenuImageValidationError) {
      throw e;
    }
    if (isMissingObjectError(e)) {
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
