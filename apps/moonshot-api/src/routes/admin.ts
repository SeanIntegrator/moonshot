import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
  ApiErrorCode,
  type AdminLoginResponse,
  type AdminSettingsResponse,
  type AdminStripeAccountLinkResponse,
  type AdminStripeAccountStatusResponse,
  type Cafe,
  type PosProvider,
} from '@moonshot/types';
import { pool } from '../db.js';
import {
  findActiveAdminUsersByEmailNormalized,
  getAdminUserWithCafeById,
  touchAdminUserLogin,
} from '../lib/admin-users-repository.js';
import { mapCafeRow, activeFeatureKeys } from '../lib/cafe-map.js';
import { verifyKdsPassword } from '../lib/kds-password.js';
import {
  mergeCafeFeatures,
  mergeKdsConfigSection,
  parseAdminSettingsPatchBody,
} from '../lib/admin-settings-merge.js';
import { requireAdminAuth } from '../middleware/admin-auth.js';
import { ApiHttpError } from '../lib/http-errors.js';
import { createAdminStripeOnboardingLink, syncAdminStripeAccountStatus } from '../lib/admin-stripe-service.js';

export const adminRouter: Router = Router();

adminRouter.post('/auth/login', async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      error: 'email and password are required',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({
      ok: false,
      error: 'Server JWT configuration missing',
      code: ApiErrorCode.CONFIG,
    });
  }

  try {
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

    const cafeResult = await pool.query(
      `SELECT
        id, name, slug, pos_provider, pos_config, payment_provider, payment_config,
        features, theme_id, theme_overrides, kds_config, timezone, owner_feedback_email
      FROM cafes
      WHERE id = $1`,
      [admin.cafe_id],
    );
    if (cafeResult.rows.length === 0) {
      return res.status(500).json({
        ok: false,
        error: 'Café not found for admin user',
        code: ApiErrorCode.INTERNAL,
      });
    }

    const cafe = mapCafeRow(cafeResult.rows[0] as Parameters<typeof mapCafeRow>[0]);
    await touchAdminUserLogin(admin.id);

    const token = jwt.sign(
      {
        sub: admin.id,
        adminUserId: admin.id,
        cafeId: cafe.cafeId,
        cafeSlug: cafe.slug,
        email: admin.email,
        purpose: 'admin',
      },
      jwtSecret,
      { expiresIn: '30d' },
    );

    const data: AdminLoginResponse = {
      token,
      cafe: { id: cafe.cafeId, slug: cafe.slug, name: cafe.name },
      adminUser: {
        id: admin.id,
        email: admin.email,
        displayName: admin.display_name,
      },
    };
    return res.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
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

  const parsed = parseAdminSettingsPatchBody(req.body);
  if (!parsed.featuresPatch && !parsed.kdsConfigPatch) {
    return res.status(400).json({
      ok: false,
      error: 'featuresPatch or kdsConfigPatch is required',
      code: ApiErrorCode.VALIDATION,
    });
  }

  try {
    const current = await pool.query(
      `SELECT
        id, name, slug, pos_provider, pos_config, payment_provider, payment_config,
        features, theme_id, theme_overrides, kds_config, timezone, owner_feedback_email
      FROM cafes
      WHERE id = $1`,
      [cafeId],
    );
    if (current.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'Café not found',
        code: ApiErrorCode.NOT_FOUND,
      });
    }

    const resolved = mapCafeRow(current.rows[0] as Parameters<typeof mapCafeRow>[0]);
    let nextFeatures = resolved.features;
    let nextKds = resolved.kdsConfig;

    if (parsed.featuresPatch) {
      const merged = mergeCafeFeatures(resolved.features, parsed.featuresPatch);
      if (!merged.ok) {
        return res.status(400).json({
          ok: false,
          error: merged.error,
          code: ApiErrorCode.VALIDATION,
        });
      }
      nextFeatures = merged.value;
    }

    if (parsed.kdsConfigPatch) {
      const merged = mergeKdsConfigSection(resolved.kdsConfig, parsed.kdsConfigPatch);
      if (!merged.ok) {
        return res.status(400).json({
          ok: false,
          error: merged.error,
          code: ApiErrorCode.VALIDATION,
        });
      }
      nextKds = merged.value;
    }

    const { rows } = await pool.query(
      `UPDATE cafes
       SET features = $1::jsonb, kds_config = $2::jsonb
       WHERE id = $3
       RETURNING
        id, name, slug, pos_provider, pos_config, payment_provider, payment_config,
        features, theme_id, theme_overrides, kds_config, timezone, owner_feedback_email`,
      [JSON.stringify(nextFeatures), JSON.stringify(nextKds), cafeId],
    );

    const out = mapCafeRow(rows[0] as Parameters<typeof mapCafeRow>[0]);
    const cafe: Cafe = {
      id: out.cafeId,
      name: out.name,
      slug: out.slug,
      posProvider: out.posProvider as PosProvider,
      paymentProvider: out.paymentProvider,
      features: out.features,
      themeId: out.themeId,
      themeOverrides: out.themeOverrides,
      kdsConfig: out.kdsConfig,
      timezone: out.timezone,
      ownerFeedbackEmail: out.ownerFeedbackEmail,
    };

    const data: AdminSettingsResponse = {
      cafe,
      activeFeatures: activeFeatureKeys(out.features),
    };
    return res.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
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

  try {
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
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
});

adminRouter.post('/payments/stripe/onboarding-link', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;

  try {
    const data: AdminStripeAccountLinkResponse = await createAdminStripeOnboardingLink(cafeId);
    return res.json({ ok: true, data });
  } catch (e) {
    if (e instanceof ApiHttpError) {
      return res.status(e.status).json({
        ok: false,
        error: e.message,
        code: e.code,
      });
    }
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Failed to create Stripe onboarding link',
      code: ApiErrorCode.INTERNAL,
    });
  }
});

adminRouter.get('/payments/stripe/status', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;

  try {
    const data: AdminStripeAccountStatusResponse = await syncAdminStripeAccountStatus(cafeId);
    return res.json({ ok: true, data });
  } catch (e) {
    if (e instanceof ApiHttpError) {
      return res.status(e.status).json({
        ok: false,
        error: e.message,
        code: e.code,
      });
    }
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Failed to load Stripe account status',
      code: ApiErrorCode.INTERNAL,
    });
  }
});
