import { Router } from 'express';
import {
  ApiErrorCode,
  type AdminCreateKdsUserResponse,
  type AdminOnboardingStatusResponse,
  type AdminRegisterResponse,
  type SlugAvailableResponse,
} from '@moonshot/types';
import { buildAdminLoginResponse } from '../lib/admin-auth-tokens.js';
import { normalizeCafeSlugInput, validateCafeSlug } from '../lib/cafe-slug.js';
import { ProvisionCafeError, isCafeSlugAvailable, provisionCafe } from '../lib/cafe-provisioning.js';
import { findCafeById } from '../lib/cafes-repository.js';
import { hashKdsPassword } from '../lib/kds-password.js';
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
  const cafeSlug = typeof body.cafeSlug === 'string' ? body.cafeSlug : '';
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

  const kdsRes = await pool.query<{ id: string }>(
    `SELECT id FROM kds_users WHERE cafe_id = $1 AND is_active = TRUE LIMIT 1`,
    [cafeId],
  );
  const menuRes = await pool.query<{ id: string }>(
    `SELECT id FROM menu_items WHERE cafe_id = $1 AND is_available = TRUE LIMIT 1`,
    [cafeId],
  );

  const data: AdminOnboardingStatusResponse = {
    completed,
    hasKdsUser: kdsRes.rows.length > 0,
    hasMenuItem: menuRes.rows.length > 0,
  };
  return res.json({ ok: true, data });
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
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || username.length < 2) {
    return res.status(400).json({
      ok: false,
      error: 'username must be at least 2 characters',
      code: ApiErrorCode.VALIDATION,
    });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({
      ok: false,
      error: 'password must be at least 8 characters',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const passwordHash = hashKdsPassword(password);
  try {
    await pool.query(
      `INSERT INTO kds_users (cafe_id, username, password_hash, display_name, is_active, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       ON CONFLICT (cafe_id, username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         is_active = TRUE,
         updated_at = NOW()`,
      [cafeId, username, passwordHash, `KDS ${username}`],
    );
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      return res.status(409).json({
        ok: false,
        error: 'Username already exists for this café',
        code: ApiErrorCode.CONFLICT,
      });
    }
    throw err;
  }

  const data: AdminCreateKdsUserResponse = { username };
  return res.status(201).json({ ok: true, data });
});
