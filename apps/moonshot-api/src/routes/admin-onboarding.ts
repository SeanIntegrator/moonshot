import { Router } from 'express';
import { ApiErrorCode, type AdminCreateKdsUserResponse, type AdminOnboardingStatusResponse, type AdminRegisterResponse, type SlugAvailableResponse } from '@moonshot/types';
import { MENU_PROVISION_SOURCES, type AdminSaveMenuTemplateRequest } from '@moonshot/domain';
import { buildAdminLoginResponse } from '../lib/admin/admin-auth-tokens.js';
import { fetchAdminOnboardingChecklist } from '../lib/admin/onboarding-repository.js';
import { normalizeCafeSlugInput, validateCafeSlug } from '../lib/cafe-slug.js';
import { ProvisionCafeError, isCafeSlugAvailable, provisionCafe } from '../lib/cafe/cafe-provisioning.js';
import { upsertKitchenLogin } from '../lib/cafe/cafe-kitchen-login.js';
import { findCafeById } from '../lib/cafes-repository.js';
import { MenuTemplateError } from '../lib/menu/menu-template-onboarding.js';
import { getMenuProvisioner, MenuProvisionError } from '../lib/menu/menu-provisioners/index.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { requireAdminAuth } from '../middleware/admin-auth.js';
import { pool } from '../db.js';

export const adminOnboardingRouter: Router = Router();

const registerLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'register' });
const slugLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60, keyPrefix: 'slug-check' });

adminOnboardingRouter.get('/slug-available', slugLimiter, async (req, res) => {
  const raw = typeof req.query.slug === 'string' ? req.query.slug : '';
  const validated = validateCafeSlug(raw);
  if (!validated.ok) {
    const data: SlugAvailableResponse = { available: false, slug: normalizeCafeSlugInput(raw) };
    return res.json({ ok: true, data });
  }
  const available = await isCafeSlugAvailable(validated.slug);
  const data: SlugAvailableResponse = { available, slug: validated.slug };
  return res.json({ ok: true, data });
});

adminOnboardingRouter.post('/register', registerLimiter, async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const cafeName = typeof body.cafeName === 'string' ? body.cafeName : '';
  const cafeSlug = typeof body.cafeSlug === 'string' ? body.cafeSlug : undefined;
  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const timezone = typeof body.timezone === 'string' ? body.timezone : undefined;

  try {
    const result = await provisionCafe({ cafeName, cafeSlug, email, password, timezone });
    const data: AdminRegisterResponse = buildAdminLoginResponse({
      adminUserId: result.adminUserId,
      cafeId: result.cafeId,
      cafeSlug: result.cafeSlug,
      cafeName: result.cafeName,
      email: result.adminEmail,
      displayName: result.displayName,
    });
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    if (err instanceof ProvisionCafeError) {
      return res.status(err.status).json({
        ok: false,
        error: err.message,
        code: err.code === 'CONFLICT' ? ApiErrorCode.CONFLICT : ApiErrorCode.VALIDATION,
      });
    }
    throw err;
  }
});

adminOnboardingRouter.get('/status', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  const cafe = await findCafeById(cafeId);
  if (!cafe) {
    return res.status(404).json({
      ok: false,
      error: 'Café not found',
      code: ApiErrorCode.NOT_FOUND,
    });
  }

  const features = cafe.features as { onboarding_completed_at?: string | null };
  const completed = Boolean(features.onboarding_completed_at);
  const checklist = await fetchAdminOnboardingChecklist(pool, cafeId);

  const data: AdminOnboardingStatusResponse = {
    completed,
    hasKdsUser: checklist.hasKdsUser,
    hasMenuItem: checklist.hasMenuItem,
  };
  return res.json({ ok: true, data });
});

adminOnboardingRouter.post('/menu-template', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  const body = req.body as AdminSaveMenuTemplateRequest;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const provisioner = getMenuProvisioner(MENU_PROVISION_SOURCES.template);
    const data = await provisioner.apply(client, cafeId, body);
    await client.query('COMMIT');
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof MenuTemplateError || err instanceof MenuProvisionError) {
      const code =
        err instanceof MenuProvisionError && err.code === 'NOT_IMPLEMENTED'
          ? ApiErrorCode.CONFIG
          : err.code;
      return res.status(err.status).json({
        ok: false,
        error: err.message,
        code,
      });
    }
    throw err;
  } finally {
    client.release();
  }
});

adminOnboardingRouter.post('/menu-pos-import', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  const body = req.body as Record<string, unknown>;
  const provider = typeof body.provider === 'string' ? body.provider : '';
  const locationId = typeof body.locationId === 'string' ? body.locationId : null;

  if (provider !== 'square') {
    return res.status(400).json({
      ok: false,
      error: 'provider must be "square"',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const provisioner = getMenuProvisioner(MENU_PROVISION_SOURCES.pos);
    const data = await provisioner.apply(client, cafeId, { provider: 'square', locationId });
    await client.query('COMMIT');
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof MenuProvisionError) {
      const code = err.code === 'NOT_IMPLEMENTED' ? ApiErrorCode.CONFIG : err.code;
      return res.status(err.status).json({
        ok: false,
        error: err.message,
        code,
      });
    }
    throw err;
  } finally {
    client.release();
  }
});

adminOnboardingRouter.post('/complete', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;

  const kdsRes = await pool.query<{ id: string }>(
    `SELECT id FROM kds_users WHERE cafe_id = $1 AND is_active = TRUE LIMIT 1`,
    [cafeId],
  );
  const menuRes = await pool.query<{ id: string }>(
    `SELECT id FROM menu_items WHERE cafe_id = $1 AND is_available = TRUE LIMIT 1`,
    [cafeId],
  );

  if (kdsRes.rows.length === 0 || menuRes.rows.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'Complete kitchen login and add at least one menu item before going live',
      code: ApiErrorCode.VALIDATION,
    });
  }

  await pool.query(
    `UPDATE cafes SET features = jsonb_set(
       COALESCE(features, '{}'::jsonb),
       '{onboarding_completed_at}',
       to_jsonb(NOW()::text),
       TRUE
     ) WHERE id = $1`,
    [cafeId],
  );

  return res.json({ ok: true, data: { completed: true } });
});

adminOnboardingRouter.post('/kds-users', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  const body = req.body as Record<string, unknown>;
  const username = typeof body.username === 'string' ? body.username.trim() : undefined;
  const password = typeof body.password === 'string' ? body.password : undefined;

  const client = await pool.connect();
  try {
    const result = await upsertKitchenLogin(client, cafeId, { username, password });
    const data: AdminCreateKdsUserResponse = result;
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create kitchen login';
    if (message.includes('username') || message.includes('password')) {
      return res.status(400).json({
        ok: false,
        error: message,
        code: ApiErrorCode.VALIDATION,
      });
    }
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      return res.status(409).json({
        ok: false,
        error: 'Username already exists for this café',
        code: ApiErrorCode.CONFLICT,
      });
    }
    throw err;
  } finally {
    client.release();
  }
});
