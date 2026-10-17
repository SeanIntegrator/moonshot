import {
  analyseMenuAgainstBenchmarks,
  buildDeterministicNarrative,
  CANONICAL_CATEGORY_LABELS,
  CANONICAL_ITEMS,
  resolveMenuEngineeringEntitlements,
  SAMPLE_UK_CAFE_MENU,
} from '@moonshot/domain';
import { ApiErrorCode } from '@moonshot/types';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from 'express';
import multer from 'multer';
import { ApiHttpError } from '../lib/http-errors.js';
import { resolveMenuEngineeringLlmAdapter } from '../lib/menu-engineering/resolve-adapter.js';
import { explainMenuEngineeringFailure } from '../lib/menu-engineering/gemini-errors.js';
import {
  MENU_ENGINEERING_MAX_FILE_BYTES,
  MENU_ENGINEERING_MAX_FILES,
  validateAndNormaliseMenuImage,
} from '../lib/menu-engineering/image-validation.js';
import { menuEngineeringAnalysisRequestSchema } from '../lib/menu-engineering/schemas.js';
import { verifyTurnstileIfConfigured } from '../lib/menu-engineering/turnstile.js';
import { createRateLimiter } from '../middleware/rate-limit.js';

/**
 * Isolated Menu Engineering HTTP router (`/api/v1/menu-engineering`).
 *
 * Flow:
 * 1. `POST /extract` — multipart menu page images → magic-byte + size check →
 *    Vision LLM structured extraction (or sample fallback in dev) → returns
 *    `ExtractedMenuPayload` for the owner's editable confirmation table.
 *    Images live in memory only and are discarded as soon as the request finishes.
 * 2. `POST /analyse` — owner-confirmed items + regionTier → deterministic rules
 *    engine against UK specialty café benchmarks → `findings` JSON → LLM prose
 *    narration strictly from `findings` → returns `{ findings, narrative, entitlements }`.
 */
export const menuEngineeringRouter: ExpressRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MENU_ENGINEERING_MAX_FILE_BYTES,
    files: MENU_ENGINEERING_MAX_FILES,
  },
});

const extractUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  upload.array('images', MENU_ENGINEERING_MAX_FILES)(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Each menu image must be under 8 MB'
          : err.code === 'LIMIT_FILE_COUNT'
            ? `You can upload up to ${MENU_ENGINEERING_MAX_FILES} menu pages at once`
            : `Upload error: ${err.message}`;
      next(new ApiHttpError(400, ApiErrorCode.VALIDATION, msg));
      return;
    }
    next(err);
  });
};

const extractRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 15,
  keyPrefix: 'menu-eng-extract',
});

const analyseRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyPrefix: 'menu-eng-analyse',
});

menuEngineeringRouter.get('/canonical-items', (_req, res) => {
  res.json({
    ok: true,
    data: {
      items: CANONICAL_ITEMS,
      categories: CANONICAL_CATEGORY_LABELS,
    },
  });
});

menuEngineeringRouter.get('/sample', (_req, res) => {
  res.json({
    ok: true,
    data: {
      menu: SAMPLE_UK_CAFE_MENU,
      entitlements: resolveMenuEngineeringEntitlements('free'),
    },
  });
});

menuEngineeringRouter.post(
  '/extract',
  extractRateLimit,
  extractUploadMiddleware,
  async (req, res) => {
    try {
    const turnstileToken =
      (typeof req.headers['x-turnstile-token'] === 'string'
        ? req.headers['x-turnstile-token']
        : undefined) ??
      (typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken : undefined);

    await verifyTurnstileIfConfigured(turnstileToken, req.ip);

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        'Please attach at least one menu photo or rendered PDF page under field "images".',
      );
    }

    const validatedImages = await Promise.all(
      files.map((file) => validateAndNormaliseMenuImage(file.buffer)),
    );

    const adapter = resolveMenuEngineeringLlmAdapter();
    if (!adapter) {
      const allowSampleFallback =
        req.query.fallback === 'sample' || req.body?.fallback === 'sample';
      if (allowSampleFallback) {
        res.json({
          ok: true,
          data: {
            menu: {
              ...SAMPLE_UK_CAFE_MENU,
              extractionNotes: [
                ...SAMPLE_UK_CAFE_MENU.extractionNotes,
                'No vision API key is set on the server — loaded sample UK specialty café extraction for local testing.',
              ],
            },
            entitlements: resolveMenuEngineeringEntitlements('free'),
          },
        });
        return;
      }

      throw new ApiHttpError(
        503,
        ApiErrorCode.CONFIG,
        'Vision extraction requires GEMINI_API_KEY or OPENAI_API_KEY on @moonshot/api (or pass ?fallback=sample / use the Sample Menu button to test without a key).',
      );
    }

    const menu = await adapter.extractMenuFromImages(validatedImages);
    res.json({
      ok: true,
      data: {
        menu,
        entitlements: resolveMenuEngineeringEntitlements('free'),
      },
    });
    } catch (err) {
      throw explainMenuEngineeringFailure(err, 'POST /menu-engineering/extract');
    }
  },
);

menuEngineeringRouter.post('/analyse', analyseRateLimit, async (req, res) => {
  try {
  const parsed = menuEngineeringAnalysisRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      firstIssue
        ? `Invalid menu payload (${firstIssue.path.join('.')}): ${firstIssue.message}`
        : 'Invalid menu analysis payload',
    );
  }

  const { menu, regionTier, tier } = parsed.data;
  const entitlements = resolveMenuEngineeringEntitlements(tier);
  const findings = analyseMenuAgainstBenchmarks(menu, regionTier);

  const adapter = resolveMenuEngineeringLlmAdapter();
  const narrative = adapter
    ? await adapter.narrateFindings(findings)
    : buildDeterministicNarrative(findings);

  res.json({
    ok: true,
    data: {
      findings,
      narrative,
      entitlements,
    },
  });
  } catch (err) {
    throw explainMenuEngineeringFailure(err, 'POST /menu-engineering/analyse');
  }
});
