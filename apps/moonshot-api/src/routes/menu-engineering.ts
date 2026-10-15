/**
 * Menu engineering tool — isolated, free-tier endpoint.
 *
 *   POST /api/v1/menu-engineering/extract   (multipart; field "files")
 *
 * Scope rules (brief + docs/architecture/roadmap.md):
 *  - No requireCafeContext — this is for owners who do not yet have a café
 *    in the system.
 *  - Stateless for the free tier: nothing persisted, image bytes dropped as
 *    soon as the response is sent.
 *  - Rate-limited per IP (abuse surface + cost control).
 *  - Returns the extraction JSON for the confirm-table UI in step 2.
 */

import { Router, type IRouter, type Request } from 'express';
import multer from 'multer';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../lib/http-errors.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import {
  AnthropicNotConfiguredError,
  ExtractionError,
  PdfRenderError,
  UnsupportedInputError,
  extractMenu,
  type IncomingFile,
} from '../lib/menu-engineering/index.js';

/** Phone photos are commonly 3–8 MB each. 15 MB is comfortable headroom. */
const MAX_FILE_BYTES = 15 * 1024 * 1024;
/** A café menu rarely needs more than a few photos; cap to control cost. */
const MAX_FILES_PER_REQUEST = 6;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_REQUEST },
});

/**
 * Free-tier rate limit: 10 extractions / hour / IP. Loose enough that one
 * owner trying different photos is fine; tight enough that a scripted abuser
 * cannot ring up a bill. Tune from telemetry; harden with Cloudflare
 * Turnstile in Step 5.
 */
const extractRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyPrefix: 'menu-engineering:extract',
});

export const menuEngineeringRouter: IRouter = Router();

menuEngineeringRouter.post(
  '/extract',
  extractRateLimit,
  upload.array('files', MAX_FILES_PER_REQUEST),
  async (req: Request, res) => {
    const multerFiles = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (multerFiles.length === 0) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Attach one or more files in the "files" field');
    }

    const files: IncomingFile[] = multerFiles.map((f) => ({
      buffer: f.buffer,
      originalName: f.originalname,
    }));

    try {
      const result = await extractMenu({ files });
      res.json({
        ok: true,
        data: {
          menu: result.menu,
          meta: { pageCount: result.meta.pageCount },
        },
      });
    } catch (e) {
      if (e instanceof AnthropicNotConfiguredError) {
        // CONFIG, not INTERNAL — the error is deployment, not request-related.
        throw new ApiHttpError(503, ApiErrorCode.CONFIG, e.message);
      }
      if (e instanceof UnsupportedInputError) {
        throw new ApiHttpError(400, ApiErrorCode.VALIDATION, e.message);
      }
      if (e instanceof PdfRenderError) {
        throw new ApiHttpError(400, ApiErrorCode.VALIDATION, e.message);
      }
      if (e instanceof ExtractionError) {
        // 502 — upstream (model) returned something unusable.
        throw new ApiHttpError(502, ApiErrorCode.INTERNAL, e.message);
      }
      throw e;
    }
  },
);
