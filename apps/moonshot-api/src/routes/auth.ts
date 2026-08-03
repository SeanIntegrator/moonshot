import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../db.js';
import { findCafeById, findCafeBySlug } from '../lib/cafes-repository.js';
import { config } from '../lib/config.js';
import { ApiHttpError } from '../lib/http-errors.js';
import {
  ensureCafeUserMembership,
  findCafeMembershipProfile,
  findUserById,
  upsertGoogleUser,
} from '../lib/users-repository.js';
import { isMenuAdminEmail, requireAuth } from '../middleware/auth.js';
import { requireCafeContext } from '../middleware/cafe-context.js';

export const authRouter: Router = Router();

const googleClient = new OAuth2Client();

authRouter.post('/google', async (req, res) => {
  const credential = typeof req.body?.credential === 'string' ? req.body.credential : undefined;
  const cafeSlug = typeof req.body?.cafeSlug === 'string' ? req.body.cafeSlug : undefined;

  if (!credential || !cafeSlug?.trim()) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'credential and cafeSlug are required');
  }

  const audience = config.googleClientId;
  const jwtSecret = config.jwtSecret;
  if (!audience || !jwtSecret) {
    throw new ApiHttpError(500, ApiErrorCode.CONFIG, 'Server auth configuration missing');
  }

  let payload: import('google-auth-library').TokenPayload | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience,
    });
    payload = ticket.getPayload() ?? undefined;
  } catch {
    throw new ApiHttpError(401, ApiErrorCode.UNAUTHORIZED, 'Invalid Google credential');
  }

  if (!payload?.email) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Google account has no email');
  }

  const email = payload.email;
  const googleId = payload.sub ?? payload.email;
  const displayName = payload.name ?? null;
  const avatarUrl = payload.picture ?? null;

  const cafe = await findCafeBySlug(cafeSlug);
  if (!cafe) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }

  const user = await upsertGoogleUser(pool, {
    googleId,
    email,
    displayName,
    avatarUrl,
  });

  const cafeId = cafe.cafeId;
  await ensureCafeUserMembership(pool, cafeId, user.id);

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
});

authRouter.get('/me', requireAuth, requireCafeContext, async (req, res) => {
  const userId = req.user?.userId;
  const cafeId = req.cafe?.cafeId;
  if (!userId || !cafeId) {
    throw new ApiHttpError(500, ApiErrorCode.INTERNAL, 'Missing user or café context');
  }

  const u = await findUserById(pool, userId);
  if (!u) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'User not found');
  }

  const membership = await findCafeMembershipProfile(pool, cafeId, userId);

  const cafe = await findCafeById(cafeId);
  if (!cafe) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }

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
      membership: membership
        ? {
            loyaltyCardProgress: membership.loyalty_card_progress,
            loyaltyDisplayId: membership.loyalty_display_id,
            totalOrders: membership.total_orders,
            onTimeCompletedOrders: membership.on_time_completed_orders,
            reviewPromptState: membership.review_prompt_state,
            firstVisit: membership.first_visit,
            freeDrinksRedeemed: membership.free_drinks_redeemed,
          }
        : null,
    },
  });
});
