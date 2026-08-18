import type { AdminSettingsResponse } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../../db.js';
import { activeFeatureKeys } from './cafe-map.js';
import { findCafeById } from '../cafes-repository.js';
import { ApiHttpError } from '../http-errors.js';
import { toPublicCafe } from '../to-public-cafe.js';
import { emitCustomerCafeUpdated } from '../../realtime/customer-events.js';
import { parseOverrideDateParam, validateHoursOverrideBody } from './hours-overrides.js';

async function cafeSettingsResponse(cafeId: string): Promise<AdminSettingsResponse> {
  const resolved = await findCafeById(cafeId);
  if (!resolved) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  emitCustomerCafeUpdated({ cafeId, updatedAt: new Date().toISOString() });
  return {
    cafe: toPublicCafe(resolved),
    activeFeatures: activeFeatureKeys(resolved.features),
  };
}

export async function upsertCafeHoursOverride(
  cafeId: string,
  body: unknown,
): Promise<AdminSettingsResponse> {
  const parsed = validateHoursOverrideBody(body);
  if (!parsed.ok) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, parsed.error);
  }
  const cafe = await findCafeById(cafeId);
  if (!cafe) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  const row = parsed.value;
  await pool.query(
    `INSERT INTO cafe_hours_overrides (cafe_id, override_date, label, closed, intervals)
     VALUES ($1, $2::date, $3, $4, $5::jsonb)
     ON CONFLICT (cafe_id, override_date)
     DO UPDATE SET label = EXCLUDED.label, closed = EXCLUDED.closed, intervals = EXCLUDED.intervals`,
    [cafeId, row.date, row.label, row.closed, JSON.stringify(row.intervals)],
  );
  return cafeSettingsResponse(cafeId);
}

export async function deleteCafeHoursOverride(
  cafeId: string,
  dateParam: string,
): Promise<AdminSettingsResponse> {
  const parsed = parseOverrideDateParam(dateParam);
  if (!parsed.ok) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, parsed.error);
  }
  const cafe = await findCafeById(cafeId);
  if (!cafe) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  const { rowCount } = await pool.query(
    `DELETE FROM cafe_hours_overrides WHERE cafe_id = $1 AND override_date = $2::date`,
    [cafeId, parsed.value],
  );
  if (!rowCount) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Override not found');
  }
  return cafeSettingsResponse(cafeId);
}
