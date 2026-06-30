import {
  MENU_IMAGE_ALLOWED_MIME_TYPES,
  MENU_IMAGE_THUMBNAIL_HEIGHT,
  MENU_IMAGE_THUMBNAIL_WIDTH,
  type MenuImageMimeType,
} from '@moonshot/types';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

const ALLOWED = new Set<string>(MENU_IMAGE_ALLOWED_MIME_TYPES);

export class MenuImageValidationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'MenuImageValidationError';
  }
}

export async function detectMenuImageMime(buffer: Buffer): Promise<MenuImageMimeType> {
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED.has(detected.mime)) {
    throw new MenuImageValidationError('Only JPEG, PNG, and WebP images are supported');
  }
  return detected.mime as MenuImageMimeType;
}

/** Resize to a small WebP thumbnail and strip metadata. */
export async function buildMenuThumbnailWebp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(MENU_IMAGE_THUMBNAIL_WIDTH, MENU_IMAGE_THUMBNAIL_HEIGHT, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 80 })
    .toBuffer();
}
