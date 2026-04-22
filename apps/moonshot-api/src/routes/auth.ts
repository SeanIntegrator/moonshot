import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../db.js';
import { mapCafeRow } from '../lib/cafe-map.js';
import { isMenuAdminEmail, requireAuth } from '../middleware/auth.js';
import { requireCafeContext } from '../middleware/cafe-context.js';

export const authRouter: Router = Router();

const googleClient = new OAuth2Client();

authRouter.post('/google', async (req, res) => {
  const credential = typeof req.body?.credential === 'string' ? req.body.credential : undefined;
  const cafeSlug = typeof req.body?.cafeSlug === 'string' ? req.body.cafeSlug : undefined;

  if (!credential || !cafeSlug?.trim()) {
    return res.status(400).json({
      ok: false,
      error: 'credential and cafeSlug are required',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const audience = process.env.GOOGLE_CLIENT_ID;
  const jwtSecret = process.env.JWT_SECRET;
  if (!audience || !jwtSecret) {
    return res.status(500).json({
      ok: false,
      error: 'Server auth configuration missing',
      code: ApiErrorCode.CONFIG,
    });
  }

  let payload: import('google-auth-library').TokenPayload | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience,
    });
    payload = ticket.getPayload() ?? undefined;
  } catch {
    return res.status(401).json({
      ok: false,
      error: 'Invalid Google credential',
      code: ApiErrorCode.UNAUTHORIZED,
    });
  }

  if (!payload?.email) {
    return res.status(400).json({
      ok: false,
      error: 'Google account has no email',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const email = payload.email;
  const googleId = payload.sub ?? payload.email;
  const displayName = payload.name ?? null;
  const avatarUrl = payload.picture ?? null;

  try {
    const cafeResult = await pool.query(
      `SELECT
        id, name, slug, pos_provider, pos_config, payment_provider, payment_config,
        features, theme_id, theme_overrides, kds_config, timezone, owner_feedback_email
      FROM cafes
      WHERE slug = $1`,
      [cafeSlug.trim()],
    );

    if (cafeResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'Café not found',
        code: ApiErrorCode.NOT_FOUND,
      });
    }

    const userResult = await pool.query(
      `INSERT INTO users (google_id, email, display_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET
         google_id = COALESCE(EXCLUDED.google_id, users.google_id),
         display_name = COALESCE(EXCLUDED.display_name, users.display_name),
         avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url)
       RETURNING id, email, display_name, avatar_url`,
      [googleId, email, displayName, avatarUrl],
    );

    const user = userResult.rows[0] as {
      id: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
    };

    const cafeId = cafeResult.rows[0].id as string;

    await pool.query(
      `INSERT INTO cafe_users (cafe_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [cafeId, user.id],
    );

    const adminCafeIds = isMenuAdminEmail(email) ? [cafeId] : undefined;

    const token = jwt.sign(
      {
        sub: user.id,
        userId: user.id,
        email: user.email,
        ...(adminCafeIds ? { adminCafeIds } : {}),
      },
      jwtSecret,
      { expiresIn: '7d' },
    );

    return res.json({
      ok: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
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

authRouter.get('/me', requireAuth, requireCafeContext, async (req, res) => {
  const userId = req.user?.userId;
  const cafeId = req.cafe?.cafeId;
  if (!userId || !cafeId) {
    return res.status(500).json({
      ok: false,
      error: 'Missing user or café context',
      code: ApiErrorCode.INTERNAL,
    });
  }

  try {
    const userResult = await pool.query(
      `SELECT id, email, display_name, avatar_url FROM users WHERE id = $1`,
      [userId],
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'User not found',
        code: ApiErrorCode.NOT_FOUND,
      });
    }

    const u = userResult.rows[0] as {
      id: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
    };

    const membership = await pool.query(
      `SELECT loyalty_stamps, total_orders, on_time_completed_orders, review_prompt_state, first_visit
       FROM cafe_users
       WHERE cafe_id = $1 AND user_id = $2`,
      [cafeId, userId],
    );

    const cafe = mapCafeRow(
      (
        await pool.query(
          `SELECT
            id, name, slug, pos_provider, pos_config, payment_provider, payment_config,
            features, theme_id, theme_overrides, kds_config, timezone, owner_feedback_email
          FROM cafes
          WHERE id = $1`,
          [cafeId],
        )
      ).rows[0] as Parameters<typeof mapCafeRow>[0],
    );

    return res.json({
      ok: true,
      data: {
        user: {
          id: u.id,
          email: u.email,
          displayName: u.display_name,
          avatarUrl: u.avatar_url,
        },
        cafe: {
          id: cafe.cafeId,
          slug: cafe.slug,
          name: cafe.name,
        },
        membership:
          membership.rows.length > 0
            ? {
                loyaltyStamps: membership.rows[0].loyalty_stamps as number,
                totalOrders: membership.rows[0].total_orders as number,
                onTimeCompletedOrders: membership.rows[0].on_time_completed_orders as number,
                reviewPromptState: membership.rows[0].review_prompt_state as string,
                firstVisit: membership.rows[0].first_visit as string,
              }
            : null,
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
