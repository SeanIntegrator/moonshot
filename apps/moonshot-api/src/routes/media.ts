import { Router } from 'express';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../lib/http-errors.js';
import { parseAllowedMenuImageObjectKey } from '../lib/menu-image-object-key.js';
import {
  getMenuImageObject,
  MenuImageNotFoundError,
  MenuImageValidationError,
} from '../lib/menu-image-storage.js';

export const mediaRouter: Router = Router();

/**
 * Public catalogue thumbnails: private Railway bucket → stable browser URLs.
 * No auth — security is allowlisted object-key shapes (no listing endpoint).
 */
mediaRouter.get('/*objectKey', async (req, res, next) => {
  const rawParam = req.params.objectKey;
  const raw = Array.isArray(rawParam) ? rawParam.join('/') : String(rawParam ?? '');
  const objectKey = parseAllowedMenuImageObjectKey(raw);
  // Helmet defaults CORP to same-origin; set on every response (incl. 404) so cross-origin
  // <img> failures are not reported as NotSameOrigin / ERR_BLOCKED_BY_RESPONSE.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (!objectKey) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid media path');
  }

  try {
    const image = await getMenuImageObject(objectKey);
    res.setHeader('Cache-Control', image.cacheControl);
    res.setHeader('Content-Type', image.contentType);
    if (image.contentLength != null) {
      res.setHeader('Content-Length', String(image.contentLength));
    }
    image.body.pipe(res);
  } catch (e) {
    if (e instanceof MenuImageNotFoundError) {
      throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, e.message);
    }
    if (e instanceof MenuImageValidationError) {
      throw new ApiHttpError(e.status, ApiErrorCode.VALIDATION, e.message);
    }
    next(e);
  }
});
