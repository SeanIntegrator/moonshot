import type { AdminSettingsResponse, PauseDuration } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { extendPauseUntil, isPauseDuration, resolvePauseUntil } from '@moonshot/domain';
import { pool } from '../../db.js';
import { activeFeatureKeys, mapCafeRow } from '../cafe/cafe-map.js';
import { CAFE_COLUMNS, findCafeById } from '../cafes-repository.js';
import { ApiHttpError } from '../http-errors.js';
import { toPublicCafe } from '../to-public-cafe.js';
import { emitCustomerCafeUpdated } from '../../realtime/customer-events.js';

async function persistPausedUntil(
  cafeId: string,
  pausedUntil: Date | null,
): Promise<AdminSettingsResponse> {
  const { rows } = await pool.query(
    `UPDATE cafes SET paused_until = $1 WHERE id = $2 RETURNING ${CAFE_COLUMNS}`,
    [pausedUntil, cafeId],
  );
  if (rows.length === 0) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  const out = mapCafeRow(rows[0] as Parameters<typeof mapCafeRow>[0]);
  emitCustomerCafeUpdated({ cafeId, updatedAt: new Date().toISOString() });
  return {
    cafe: toPublicCafe(out),
    activeFeatures: activeFeatureKeys(out.features),
  };
}

export async function pauseCafeService(
  cafeId: string,
  body: unknown,
): Promise<AdminSettingsResponse> {
  const duration =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as { duration?: unknown }).duration
      : undefined;
  if (!isPauseDuration(duration)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'duration must be 15m, 30m, 1h, or rest_of_today');
  }
  const cafe = await findCafeById(cafeId);
  if (!cafe) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  const until = resolvePauseUntil({ duration, timezone: cafe.timezone });
  return persistPausedUntil(cafeId, until);
}

export async function resumeCafeService(cafeId: string): Promise<AdminSettingsResponse> {
  const cafe = await findCafeById(cafeId);
  if (!cafe) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  return persistPausedUntil(cafeId, null);
}

export async function extendCafePause(
  cafeId: string,
  body: unknown,
): Promise<AdminSettingsResponse> {
  const minutes =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as { minutes?: unknown }).minutes
      : 15;
  if (minutes !== 15) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'minutes must be 15');
  }
  const cafe = await findCafeById(cafeId);
  if (!cafe) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  const until = extendPauseUntil({ pausedUntil: cafe.pausedUntil, minutes: 15 });
  return persistPausedUntil(cafeId, until);
}

export type { PauseDuration };
