import {
  MENU_IMAGE_ALLOWED_MIME_TYPES,
  MENU_IMAGE_THUMBNAIL_HEIGHT,
  MENU_IMAGE_THUMBNAIL_WIDTH,
  MENU_IMAGE_WEBP_QUALITY,
  type MenuImageMimeType,
} from '@moonshot/types';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

const ALLOWED = new Set<string>(MENU_IMAGE_ALLOWED_MIME_TYPES);

/** Letterbox fill — drink photos are shot on white studio backgrounds. */
const THUMBNAIL_BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 };

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

/**
 * Fit the full drink into the thumbnail frame (no crop), letterbox with white,
 * then encode a higher-quality WebP.
 */
export async function buildMenuThumbnailWebp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(MENU_IMAGE_THUMBNAIL_WIDTH, MENU_IMAGE_THUMBNAIL_HEIGHT, {
      fit: 'contain',
      position: 'centre',
      background: THUMBNAIL_BACKGROUND,
    })
    .webp({ quality: MENU_IMAGE_WEBP_QUALITY })
    .toBuffer();
}
