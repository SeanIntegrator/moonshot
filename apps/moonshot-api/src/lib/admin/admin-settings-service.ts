import type { AdminSettingsResponse } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../../db.js';
import { activeFeatureKeys, mapCafeRow } from '../cafe/cafe-map.js';
import { CAFE_COLUMNS, findCafeById } from '../cafes-repository.js';
import {
  mergeCafeFeatures,
  mergeKdsConfigSection,
  parseAdminSettingsPatchBody,
  validateCafeHoursPatch,
} from './admin-settings-merge.js';
import { ApiHttpError } from '../http-errors.js';
import { toPublicCafe } from '../to-public-cafe.js';

export type AdminSettingsPatchInput = ReturnType<typeof parseAdminSettingsPatchBody>;

/**
 * Merge feature + KDS config patches and persist on the café row.
 * Throws {@link ApiHttpError} for validation / not-found cases.
 */
export async function patchAdminCafeSettings(
  cafeId: string,
  body: unknown,
): Promise<AdminSettingsResponse> {
  const parsed = parseAdminSettingsPatchBody(body);
  if (!parsed.featuresPatch && !parsed.kdsConfigPatch && parsed.hours === undefined) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      'featuresPatch, kdsConfigPatch, or hours is required',
    );
  }

  const resolved = await findCafeById(cafeId);
  if (!resolved) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }

  let nextFeatures = resolved.features;
  let nextKds = resolved.kdsConfig;
  let nextHours = resolved.hours;

  if (parsed.featuresPatch) {
    const merged = mergeCafeFeatures(resolved.features, parsed.featuresPatch);
    if (!merged.ok) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, merged.error);
    }
    nextFeatures = merged.value;
  }

  if (parsed.kdsConfigPatch) {
    const merged = mergeKdsConfigSection(resolved.kdsConfig, parsed.kdsConfigPatch);
    if (!merged.ok) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, merged.error);
    }
    nextKds = merged.value;
  }

  if (parsed.hours !== undefined) {
    const validated = validateCafeHoursPatch(parsed.hours);
    if (!validated.ok) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, validated.error);
    }
    nextHours = validated.value;
  }

  const { rows } = await pool.query(
    `UPDATE cafes
     SET features = $1::jsonb, kds_config = $2::jsonb, hours = $3::jsonb
     WHERE id = $4
     RETURNING ${CAFE_COLUMNS}`,
    [JSON.stringify(nextFeatures), JSON.stringify(nextKds), JSON.stringify(nextHours), cafeId],
  );

  const out = mapCafeRow(rows[0] as Parameters<typeof mapCafeRow>[0]);

  return {
    cafe: toPublicCafe(out),
    activeFeatures: activeFeatureKeys(out.features),
  };
}
