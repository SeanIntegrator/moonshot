import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
  ApiErrorCode,
  type AdminLoginResponse,
  type AdminStripeAccountLinkResponse,
  type AdminStripeAccountStatusResponse,
} from '@moonshot/types';
import {
  findActiveAdminUsersByEmailNormalized,
  getAdminUserWithCafeById,
  touchAdminUserLogin,
} from '../lib/admin-users-repository.js';
import { findCafeById } from '../lib/cafes-repository.js';
import { patchAdminCafeSettings } from '../lib/admin-settings-service.js';
import { verifyKdsPassword } from '../lib/kds-password.js';
import { requireAdminAuth } from '../middleware/admin-auth.js';
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
