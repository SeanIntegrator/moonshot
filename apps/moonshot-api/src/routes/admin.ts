import { Router } from 'express';
import {
  ApiErrorCode,
  type AdminLoginResponse,
  type AdminStockOptionPutBody,
  type AdminStripeAccountLinkResponse,
  type AdminStripeAccountStatusResponse,
} from '@moonshot/types';
import {
  findActiveAdminUsersByEmailNormalized,
  getAdminUserWithCafeById,
  touchAdminUserLogin,
} from '../lib/admin/admin-users-repository.js';
import { buildAdminLoginResponse } from '../lib/admin/admin-auth-tokens.js';
import { findCafeById } from '../lib/cafes-repository.js';
import { patchAdminCafeSettings } from '../lib/admin/admin-settings-service.js';
import {
  extendCafePause,
  pauseCafeService,
  resumeCafeService,
} from '../lib/admin/cafe-service-pause.js';
import {
  deleteCafeHoursOverride,
  upsertCafeHoursOverride,
} from '../lib/cafe/hours-overrides-service.js';
import { verifyKdsPassword } from '../lib/kds-password.js';
import { requireAdminAuth } from '../middleware/admin-auth.js';
import {
  createAdminStripeOnboardingLink,
  syncAdminStripeAccountStatus,
} from '../lib/admin/admin-stripe-service.js';
import { adminConnectSquareRouter } from './admin-connect-square.js';
import { adminOnboardingRouter } from './admin-onboarding.js';
import { stripeConnectCallbacksRouter } from './stripe-connect-callbacks.js';
import { runCatalogSyncForCafe } from '../lib/pos-adapters/square/catalog-sync.js';
import { adminLoginBodySchema, parseBody } from '../lib/validation/auth-bodies.js';
import { getAdminStock, putOptionAvailability } from '../lib/menu/admin-stock.js';
import { UUID_RE } from '../lib/uuid.js';
import { pool } from '../db.js';

export const adminRouter: Router = Router();

adminRouter.use('/onboarding', adminOnboardingRouter);
adminRouter.use('/connect/square', adminConnectSquareRouter);

adminRouter.post('/auth/login', async (req, res) => {
  const parsed = parseBody(adminLoginBodySchema, req.body);
  if (!parsed.ok) {
    return res.status(400).json({
      ok: false,
      error: 'email and password are required',
      code: ApiErrorCode.VALIDATION,
    });
  }
  const { email, password } = parsed.data;

  const candidates = await findActiveAdminUsersByEmailNormalized(email);
  if (candidates.length !== 1) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid email or password',
      code: ApiErrorCode.UNAUTHORIZED,
    });
  }
  const admin = candidates[0]!;
  if (!verifyKdsPassword(password, admin.password_hash)) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid email or password',
      code: ApiErrorCode.UNAUTHORIZED,
    });
  }

  const cafe = await findCafeById(admin.cafe_id);
  if (!cafe) {
    return res.status(500).json({
      ok: false,
      error: 'Café not found for admin user',
      code: ApiErrorCode.INTERNAL,
    });
  }

  await touchAdminUserLogin(admin.id);

  const data: AdminLoginResponse = buildAdminLoginResponse({
    adminUserId: admin.id,
    cafeId: cafe.cafeId,
    cafeSlug: cafe.slug,
    cafeName: cafe.name,
    email: admin.email,
    displayName: admin.display_name,
  });
  return res.json({ ok: true, data });
});

adminRouter.patch('/settings', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser?.cafeId;
  if (!cafeId) {
    return res.status(500).json({
      ok: false,
      error: 'Missing admin context',
      code: ApiErrorCode.INTERNAL,
    });
  }

  const data = await patchAdminCafeSettings(cafeId, req.body);
  return res.json({ ok: true, data });
});

adminRouter.post('/service/pause', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser?.cafeId;
  if (!cafeId) {
    return res.status(500).json({
      ok: false,
      error: 'Missing admin context',
      code: ApiErrorCode.INTERNAL,
    });
  }
  const data = await pauseCafeService(cafeId, req.body);
  return res.json({ ok: true, data });
});

adminRouter.post('/service/resume', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser?.cafeId;
  if (!cafeId) {
    return res.status(500).json({
      ok: false,
      error: 'Missing admin context',
      code: ApiErrorCode.INTERNAL,
    });
  }
  const data = await resumeCafeService(cafeId);
  return res.json({ ok: true, data });
});

adminRouter.post('/service/extend', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser?.cafeId;
  if (!cafeId) {
    return res.status(500).json({
      ok: false,
      error: 'Missing admin context',
      code: ApiErrorCode.INTERNAL,
    });
  }
  const data = await extendCafePause(cafeId, req.body);
  return res.json({ ok: true, data });
});

adminRouter.put('/hours/overrides', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser?.cafeId;
  if (!cafeId) {
    return res.status(500).json({
      ok: false,
      error: 'Missing admin context',
      code: ApiErrorCode.INTERNAL,
    });
  }
  const data = await upsertCafeHoursOverride(cafeId, req.body);
  return res.json({ ok: true, data });
});

adminRouter.delete('/hours/overrides/:date', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser?.cafeId;
  if (!cafeId) {
    return res.status(500).json({
      ok: false,
      error: 'Missing admin context',
      code: ApiErrorCode.INTERNAL,
    });
  }
  const date = typeof req.params.date === 'string' ? req.params.date : '';
  const data = await deleteCafeHoursOverride(cafeId, date);
  return res.json({ ok: true, data });
});

adminRouter.get('/auth/me', requireAdminAuth, async (req, res) => {
  const adminUserId = req.adminUser?.adminUserId;
  if (!adminUserId) {
    return res.status(500).json({
      ok: false,
      error: 'Missing admin context',
      code: ApiErrorCode.INTERNAL,
    });
  }

  const row = await getAdminUserWithCafeById(adminUserId);
  if (!row) {
    return res.status(404).json({
      ok: false,
      error: 'Admin user not found',
      code: ApiErrorCode.NOT_FOUND,
    });
  }

  return res.json({
    ok: true,
    data: {
      adminUser: {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
      },
      cafe: {
        id: row.cafe_id,
        slug: row.cafe_slug,
        name: row.cafe_name,
      },
    },
  });
});

adminRouter.use('/payments/stripe', stripeConnectCallbacksRouter);

adminRouter.post('/payments/stripe/onboarding-link', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  const data: AdminStripeAccountLinkResponse = await createAdminStripeOnboardingLink(cafeId);
  return res.json({ ok: true, data });
});

adminRouter.get('/payments/stripe/status', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  const data: AdminStripeAccountStatusResponse = await syncAdminStripeAccountStatus(cafeId);
  return res.json({ ok: true, data });
});

adminRouter.get('/stock', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  const data = await getAdminStock(pool, cafeId);
  return res.json({ ok: true, data });
});

adminRouter.put('/stock/options/:optionId', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  const rawId = req.params.optionId;
  const optionId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!optionId || !UUID_RE.test(optionId)) {
    return res.status(400).json({
      ok: false,
      error: 'optionId must be a UUID',
      code: ApiErrorCode.VALIDATION,
    });
  }
  const body = (req.body ?? {}) as AdminStockOptionPutBody;
  const data = await putOptionAvailability(pool, cafeId, optionId, body);
  return res.json({ ok: true, data });
});

/**
 * Pull Square Catalog deltas into Postgres (Square is source of truth).
 * Body optional: `{ forceFull?: boolean }` for a full re-list instead of incremental Search.
 */
adminRouter.post('/menu/sync-pos', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const forceFull = body.forceFull === true;
  try {
    const data = await runCatalogSyncForCafe(cafeId, { forceFull });
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Catalog sync failed';
    return res.status(502).json({
      ok: false,
      error: message,
      code: ApiErrorCode.VALIDATION,
    });
  }
});
