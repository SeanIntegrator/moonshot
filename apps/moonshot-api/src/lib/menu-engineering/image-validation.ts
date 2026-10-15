import { ApiErrorCode } from '@moonshot/types';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { ApiHttpError } from '../http-errors.js';
import type { MenuImageInput, SupportedMenuImageMime } from './llm-adapter.js';

export const MENU_ENGINEERING_MAX_FILES = 6;
export const MENU_ENGINEERING_MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB per page/photo
const MAX_VISION_DIMENSION_PX = 2048;

const SUPPORTED_MIMES = new Set<SupportedMenuImageMime>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Validates magic bytes of an uploaded menu image and normalises orientation/dimensions
 * in memory using `sharp` so vision inference stays fast and stateless (no disk writes).
 */
export async function validateAndNormaliseMenuImage(
  rawBuffer: Buffer,
): Promise<MenuImageInput> {
  if (!rawBuffer || rawBuffer.byteLength === 0) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Uploaded image file is empty');
  }

  if (rawBuffer.byteLength > MENU_ENGINEERING_MAX_FILE_BYTES) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      'Each menu image must be under 8 MB',
    );
  }

  const detected = await fileTypeFromBuffer(rawBuffer);
  if (!detected || !SUPPORTED_MIMES.has(detected.mime as SupportedMenuImageMime)) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      'Unsupported file format. Please upload JPEG, PNG, or WebP images (PDFs and HEIC photos are converted in the browser before upload).',
    );
  }

  const normalisedBuffer = await sharp(rawBuffer)
    .rotate()
    .resize(MAX_VISION_DIMENSION_PX, MAX_VISION_DIMENSION_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 86 })
    .toBuffer();

  return {
    buffer: normalisedBuffer,
    mimeType: 'image/jpeg',
  };
}
